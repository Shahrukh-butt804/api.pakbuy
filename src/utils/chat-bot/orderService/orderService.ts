import mongoose from "mongoose";
import { Cart } from "../../../models/cart";
import { Order } from "../../../models/order";
import Stripe from "stripe";
import { User } from "../../../models/user";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);


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

  if (!lastOrder.stripeSource) {
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

  let charge: any;

  try {
    const customer = await stripe.customers.create({
      email: lastOrder.billingAddress?.email || user.email,
      source: lastOrder.stripeSource,
    });

    charge = await stripe.charges.create({
      amount: Math.round(checkout.totalAmount * 100),
      currency: "usd",
      description: `Charge for order by ${lastOrder.billingAddress?.email || user.email}`,
      customer: customer.id,
    });

    if (charge.status !== "succeeded") {
      throw new OrderError(
        "PAYMENT_FAILED",
        "Payment failed. Your order was not placed."
      );
    }

  } catch (error) {
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
    stripeSource: lastOrder.stripeSource,
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


  await Cart.findOneAndUpdate(
    { user: user._id },
    { $set: { items: [], totalAmount: 0 } }
  );

  return order;
}

export async function getUserOrders(userId: string) {
  return Order.find({
    user: userId,
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "items.collection",
      select: "title image",
    })
    .lean();
}

export async function getLastOrder(userId: string) {
  return Order.findOne({
    user: userId,
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "items.collection",
      select: "title image",
    })
    .lean();
}

export async function getOrderById(
  userId: string,
  orderId: string
) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new OrderError(
      "ORDER_NOT_FOUND",
      "Invalid order ID"
    );
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  })
    .populate({
      path: "items.collection",
      select: "title image",
    })
    .lean();

  if (!order) {
    throw new OrderError(
      "ORDER_NOT_FOUND",
      "Order not found"
    );
  }

  return order;
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