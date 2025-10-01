import dotenv from "dotenv";
const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

import { Response } from "express";
import Stripe from "stripe";
import { Order } from "../models/order";
import { Payment } from "../models/payment";
import { orderConfirmation } from "../utils/nodeMailer";
import { tryCatch } from "../utils/tryCatch";
import { Collection } from "../models/collection";
import { Coupon } from "../models/coupon";
import { Product } from "../models/product";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const getStripeKeys = tryCatch(async (req: any, res: Response): Promise<any> => {
  return res.status(200).json({
    message: "Stripe keys fetched successfully!",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

const createOrder = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    billingAddress,
    shippingAddress,
    token,
    orderNote,
    products,
    couponId
  } = req.body;

  let totalAmount = 0;
  let allCodes = [];

  for (const item of products) {
    const collection = await Collection.findById(item.collectionId);

    if (!collection) {
      return res.status(404).json({ message: `Collection not found for ID: ${item.collectionId}` });
    }

    const allProducts: any = await Product.find(
      { _id: { $in: collection.products } }
    )

    if (!allProducts || !allProducts.length) {
      return res.status(404).json({ message: `No products found in this collection` });
    }

    for (const product of allProducts) {

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for  ${product.name} in ${collection.name}` });
      }

      product.stock -= Number(item.quantity);
      totalAmount += product.price * item.quantity;

      if (product?.codes && product?.codes?.length > 0) {
        const takenCodes = product?.codes?.splice(0, item.quantity) ?? [];
        allCodes.push({
          name: product.name,
          codes: takenCodes
        });
      }

      await product.save({ validateBeforeSave: false });
    }


  }

  // twenty percent tax
  totalAmount += totalAmount * 0.2;

  if (couponId) {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ message: "Invalid Coupon Id" });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ message: "Coupon is not active" });
    }
    if (coupon.limit <= 0) {
      return res.status(400).json({ message: "Coupon limit exceeded" });
    }
    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: "Coupon is expired" });
    }
    const couponUsedByUser = coupon.usedBy.filter((id: any) => id.equals(req.user._id)).length;

    if (couponUsedByUser >= coupon.perUserLimit) {
      return res.status(400).json({ message: "Coupon limit per user exceeded" });
    }

    totalAmount = Math.max(
      0,
      coupon.type === "amount"
        ? totalAmount - coupon.value
        : totalAmount - (totalAmount * coupon.value) / 100
    );
    coupon.limit -= 1;
    coupon.usedBy.push(req.user._id);
    await coupon.save();
  }

  totalAmount = Number(totalAmount.toFixed(2));


  const order = await Order.create({
    user: req.user._id ? req.user._id : null,
    billingAddress,
    shippingAddress: shippingAddress ? shippingAddress : billingAddress,
    stripeSource: token,
    orderNote,
    totalAmount: Number(totalAmount.toFixed(2)),
    products,

  });

  if (!order) {
    return res.status(500).json({ message: "Failed to create order" });
  }


  // make payment
  const customer = await stripe.customers.create({
    email: billingAddress.email,
    source: token,
  });

  // Create the charge
  const charge = await stripe.charges.create({
    amount: totalAmount * 100,
    currency: 'usd',
    description: orderNote || "",
    customer: customer.id
  });


  if (charge.status !== "succeeded") {
    return res.status(400).json({ message: "payment Failed From Stripe" });
  }

  const payment = await Payment.create({
    orderId: order._id,
    amount: Number(totalAmount.toFixed(2)),
    paymentMethod: "Stripe",
    metaData: charge
  });

  if (!payment) {
    return res.status(500).json({ message: "Failed to create payment" });
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    order._id,
    {
      $set: {
        status: "confirmed",
      },
    },
    {
      new: true,
    },
  )


  if (!updatedOrder) {
    return res.status(500).json({ message: "Failed to update order" });
  }

  const result = await orderConfirmation(
    order?.billingAddress?.email,
    "Order Confirmation - Choose Well",
    {
      customerName: order?.billingAddress?.firstName + " " + order?.billingAddress?.lastName,
      orderId: order?._id.toString(),
      totalAmount: totalAmount,
      orderDate: new Date().toLocaleDateString(),
      packageData: allCodes,
      trackingLink: `/track-order/${order._id}`,
    }
  );

  if (!result) {
    return res.status(500).json({ message: "Failed to send email" });
  }

  return res.status(200).json({
    message: "Order created successfully!",
    success: true,
    order: updatedOrder,
  });
});

const getAllOrder = tryCatch(async (req: any, res: Response): Promise<any> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword?.trim() || "";
  const skip = (page - 1) * limit;

  const searchQuery = keyword
    ? {
      $or: [
        { orderNote: { $regex: keyword, $options: "i" } },
        { status: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [orders, totalDocs] = await Promise.all([
    Order.find(searchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Order.countDocuments(searchQuery),
  ]);

  return res.status(200).json({
    message: "Orders fetched successfully!",
    orders,
    pagination: {
      totalDocs,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });
});

const getOrderById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const order = await Order.findById(req.params.id).populate("user").populate({
    path: "products.collectionId",
  });;

  if (!order) {
    return res.status(404).json({ message: "order not found" });
  }

  return res.status(200).json({
    message: "order fetched successfully!",
    order,
  });

});

const getOrderByUser = tryCatch(async (req: any, res: Response): Promise<any> => {

  const orders = await Order.find({ user: req.user._id }).populate("products.collectionId").sort({ createdAt: -1 });

  if (!orders || !orders.length) {
    return res.status(404).json({ message: "No orders found" });
  }

  return res.status(200).json({
    message: "orders fetched successfully!",
    orders,
  });

});

const deleteOrder = tryCatch(async (req: any, res: Response): Promise<any> => {

  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "order not found" });
  }
  return res.status(200).json({
    message: "order deleted successfully!",
    order,
  });

});

const updateOrderStatus = tryCatch(async (req: any, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "dispatched", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status == status) {
      return res.status(400).json({ success: false, message: `Order status is already ${status}` });
    }

    if (order.status == "delivered" && status == "cancelled") {
      return res.status(400).json({ success: false, message: "Delivered order cannot be cancelled" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cancelled order cannot change status" });
    }

    if (order.status === "delivered" && (status == "dispatched" || status == "confirmed" || status == "pending")) {
      return res.status(400).json({ success: false, message: `Delivered order cannot revert back to ${status}` });
    }

    if (order.status === "dispatched" && (status === "confirmed")) {
      return res.status(400).json({ success: false, message: `Dispatched order cannot revert back to ${status}` });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
})


export {
  getStripeKeys,
  createOrder, deleteOrder, getAllOrder,
  getOrderById, getOrderByUser, updateOrderStatus
};

