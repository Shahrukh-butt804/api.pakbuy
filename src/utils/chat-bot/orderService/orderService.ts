import mongoose from "mongoose";
import { Cart } from "../../../models/cart";
import { Order } from "../../../models/order";
import { Payment } from "../../../models/payment";
import { User } from "../../../models/user";
import { makeStripePayment } from "../../stripe";

interface OrderSearchFilters {
  date?: string;
  status?: string;
  totalAmount?: number;
  productCount?: number;
}
export class OrderError extends Error {
  constructor(
    public code:
      | "NOT_AUTHENTICATED"
      | "CART_EMPTY"
      | "NO_PAYMENT_SOURCE"
      | "PAYMENT_FAILED"
      | "ORDER_NOT_FOUND"
      | "NO_PREVIOUS_ORDER"
      | "EMPTY_CART"
      | "ORDER_CREATION_FAILED",
    message: string
  ) {
    super(message);
    this.name = "OrderError";
  }
}




async function getCheckoutCart(userId: string) {
  const cart: any = await Cart.findOne({
    user: userId,
  })
    .populate({
      path: "items.collection",
      select: "title CollectionPrice",
    })
    .lean();

  if (!cart || !cart.items?.length) {
    throw new OrderError(
      "CART_EMPTY",
      "Cart is empty"
    );
  }

  let totalAmount = 0;

  const items = cart.items.map((item: any) => {
    const collection = item.collection;

    if (!collection) {
      throw new OrderError(
        "ORDER_CREATION_FAILED",
        "A collection in the cart no longer exists."
      );
    }

    const price = collection.CollectionPrice ?? 0;
    const quantity = item.quantity;

    const subTotal = price * quantity;

    totalAmount += subTotal;

    return {
      collection: collection._id,
      title: collection.title,
      quantity,
      price,
      subTotal,
    };
  });

  return {
    cart,
    items,
    totalAmount,
  };
}

export async function createOrder(userId: string) {
  const user: any = await User.findById(userId).lean();

  if (!user) {
    throw new OrderError(
      "NOT_AUTHENTICATED",
      "User not found"
    );
  }

  const lastOrder: any = await Order.findOne({ user: user._id })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastOrder) {
    throw new OrderError(
      "NO_PREVIOUS_ORDER",
      "You need to place at least one order manually before you can place orders using the Assistant."
    );
  }

  if (!lastOrder.paymentSource) {
    throw new OrderError(
      "NO_PAYMENT_SOURCE",
      "Your previous order does not have a payment method available. Please place an order manually first."
    );
  }


  const checkout = await getCheckoutCart(userId);

  if (!checkout.items?.length) {
    throw new OrderError(
      "EMPTY_CART",
      "Your cart is empty. Add something to your cart before placing the order."
    );
  }

  let metaData: any;

  try {

    const { status, message, charge } = await makeStripePayment({
      token: lastOrder.paymentSource,
      amount: checkout.totalAmount,
      description: `Order placed By Assistant for (${user.fullName})`,
      user
    })

    if (!status) {
      throw new OrderError(
        "PAYMENT_FAILED",
        message || "Payment failed. Your order was not placed1111."
      );
    }

    metaData = charge

  } catch (error: any) {
    if (error?.code === "token_already_used" || error?.raw?.code === "token_already_used") {
      console.error("Stripe payment source already used:", error.message);
      throw new OrderError("PAYMENT_FAILED", "Your saved payment method can no longer be reused. Please place an order manually with a new payment method first."
      )
    }

    if (error instanceof OrderError) { throw error }
    console.error("AI order payment error:", error);

    throw new OrderError(
      "PAYMENT_FAILED",
      "Payment failed. Your order was not placed."
    );
  }

  const order = await Order.create({
    user: user._id,
    billingAddress: lastOrder.billingAddress,
    shippingAddress: lastOrder.shippingAddress,
    paymentSource: lastOrder.paymentSource,
    orderNote: "Order Placed By Assistant",
    products: checkout.items.map((item: any) => ({
      collectionId: item.collection,
      quantity: item.quantity,
    })),
    subTotal: checkout.totalAmount,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: checkout.totalAmount,
    status: "pending",
  });

  await Payment.create({
    orderId: order._id,
    amount: checkout.totalAmount,
    paymentMethod: "Stripe",
    metaData,
  });

  await Cart.findOneAndUpdate(
    { user: user._id },
    { $set: { items: [], totalAmount: 0 } }
  );

  return order;
}

export async function getUserOrders(userId: string) {
  return Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "products.collectionId",
      select: "title name image CollectionPrice",
    })
    .lean();
}

export async function getLastOrder(userId: string) {
  return Order.findOne({
    user: userId,
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "products.collectionId",
      select: "title name image CollectionPrice",
    })
    .lean();
}

export async function getFirstOrder(userId: string) {
  return Order.findOne({
    user: userId,
  })
    .sort({ createdAt: 1 })
    .populate({
      path: "products.collectionId",
      select: "title name image CollectionPrice",
    })
    .lean();
}

export async function findOrder(userId: string, filters: OrderSearchFilters) {
  const query: any = {
    user: userId,
  };

  // Status
  if (filters.status) {
    query.status = filters.status;
  }

  // Total amount
  if (filters.totalAmount !== undefined) {
    query.totalAmount = filters.totalAmount;
  }

  // Date
  if (filters.date) {
    const startDate = new Date(filters.date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(filters.date);
    endDate.setHours(23, 59, 59, 999);

    query.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  // Number of different product/collection types
  if (filters.productCount !== undefined) {
    query.$expr = {
      $eq: [
        { $size: "$products" },
        filters.productCount,
      ],
    };
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "products.collectionId",
      select: "title name image CollectionPrice",
    })
    .lean();

  if (!orders.length) {
    throw new OrderError(
      "ORDER_NOT_FOUND",
      "No matching orders were found."
    );
  }

  return orders;
}

export async function getOrderSummary(userId: string) {
  const result = await Order.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
  ]);

  if (!result.length) {
    return {
      totalOrders: 0,
      totalSpent: 0,
    };
  }

  return {
    totalOrders: result[0].totalOrders,
    totalSpent: result[0].totalSpent,
  };
}