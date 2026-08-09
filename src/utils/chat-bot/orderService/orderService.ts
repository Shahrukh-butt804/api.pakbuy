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

  // if (!user.paymentSource) {
  //   throw new OrderError(
  //     "NO_PAYMENT_SOURCE",
  //     "First You have make first order manually then payment will be automatically linked to your account"
  //   );
  // }

  const checkout = await getCheckoutCart(userId);

  try {

    // ✅ Stripe Customer
    const customer = await stripe.customers.create({
      email: user.email,
      source: "tok_visa",
    });

    // ✅ Charge customer (with tax)
    const charge = await stripe.charges.create({
      amount: Math.round(checkout.totalAmount * 100),
      currency: "usd",
      description: `Charge for order by ${user.email}`,
      customer: customer.id
    });

    if (charge.status !== "succeeded") {
      throw new OrderError(
        "PAYMENT_FAILED",
        "Payment failed"
      );
    }

  } catch (error) {
    console.error("Payment error:", error);

    throw new OrderError(
      "PAYMENT_FAILED",
      "Payment failed"
    );
  }

  const order = await Order.create({
    user: user._id,
    billingAddress: {
      firstName: "Test",
      lastName: "User",
      address: "123 Test Street",
      country: "Pakistan",
      state: "Sindh",
      city: "Karachi",
      zipCode: "74000",
      email: user.email,
      phone: "03001234567",
    },
    shippingAddress: {
      firstName: "Test",
      lastName: "User",
      address: "123 Test Street",
      country: "Pakistan",
      state: "Sindh",
      city: "Karachi",
      zipCode: "74000",
      email: user.email,
      phone: "03001234567",
    },
    stripeSource: "tok_visa",
    orderNote: "",

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

  // Only clear the cart AFTER order creation succeeds.
  await Cart.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        items: [],
        totalAmount: 0,
      },
    }
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