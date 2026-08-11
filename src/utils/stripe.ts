import dotenv from "dotenv";
import Stripe from "stripe";

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface StripePaymentParams {
  token: string;
  amount: number; // finalTotal (not in cents)
  description: string;
  user: any;
}

export function getCommission(amount: number, percent: number = 10): number {
  const rate = percent / 100;
  return parseFloat((amount * rate).toFixed(2));
}

export const makeStripePayment = async ({ token, amount, description, user }: StripePaymentParams) => {
  // 1️⃣ Create customer
  const customer = await stripe.customers.create({
    email: user.email,
    source: token,
  });

  // 2️⃣ Charge customer
  const charge = await stripe.charges.create({
    amount: Math.round(amount * 100), // convert to cents
    currency: "usd",
    description,
    customer: customer.id,
  });

  if (charge.status !== "succeeded") {
    return ({
      status: false,
      message: "Payment failed from Stripe"
    });
  }

  return {
    status: true,
    message: "Payment successful",
    charge,
  };
};