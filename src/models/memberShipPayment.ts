import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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

export const MemberShipPayment = mongoose.model("MemberShipPayment", paymentSchema);
