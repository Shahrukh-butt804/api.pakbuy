import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  metaData: {
    type: Object,
    default: {},
  }

}, { timestamps: true });

export const Payment = mongoose.model("Payment", paymentSchema);
