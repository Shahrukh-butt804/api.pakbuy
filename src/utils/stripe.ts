import dotenv from "dotenv";
import Stripe from "stripe";
import { Subscription } from "../models/subscription";
import { Order } from "../models/order";

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface StripePaymentParams {
  amount: number;
  description: string;
  sourceId?: string;  // will be frontend token or save customer's cardId
  user?: any;
  customerId?: string,
}


export const makeStripePayment = async ({ sourceId, amount, description, user, customerId }: StripePaymentParams) => {
  try {
    // =========================
    // RECURRING PAYMENT
    // =========================
    if (customerId && sourceId) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to cents
        currency: "usd",
        customer: customerId,
        payment_method: sourceId,
        confirm: true,
        off_session: true,
        description,
      });

      if (paymentIntent.status !== "succeeded") {
        return {
          status: false,
          message: `Payment ${paymentIntent.status}`,
        };
      }

      return {
        status: true,
        message: "Payment successful",
        charge: paymentIntent,
      };
    }

    // =========================
    // NORMAL / NON-RECURRING PAYMENT
    // =========================
    const customer = await stripe.customers.create({
      email: user.email,
      source: sourceId,
    });

    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: "usd",
      description,
      customer: customer.id,
    });

    if (charge.status !== "succeeded") {
      return {
        status: false,
        message: charge.failure_message || charge.outcome?.seller_message || `Payment ${charge.status}`,
      };
    }

    return {
      status: true,
      message: "Payment successful",
      charge,
    };

  } catch (error: any) {
    console.error("Stripe payment error:", error);

    return {
      status: false,
      message: error?.raw?.message || error?.message || "Stripe payment failed",
    };
  }
};

export const stripeRecurringPaymentMethod = async ({ token, user }: { token: string; user: any }) => {
  try {

    const existingOrder = await Order.findOne({
      user: user._id,
      customerId: { $exists: true, $ne: null },
    }).select("customerId");

    let customerId = existingOrder?.customerId || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
      });
      customerId = customer.id;
    }

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: { token },
    });

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });

    return {
      status: true,
      customerId: customerId,
      cardId: paymentMethod.id,
      message: "Recurring payment method saved successfully",
    };
  } catch (error: any) {
    console.error("Stripe recurring payment method error:", error);

    return {
      status: false,
      message: error?.raw?.message || error?.message || "Failed to save recurring payment method"
    };
  }
};