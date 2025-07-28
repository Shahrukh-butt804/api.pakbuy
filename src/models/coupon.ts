import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true
  },
  discount: {
    type: Number,
    required: true
  },
  minOrderAmount: Number,
  usageLimit: Number,
  usedCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  isOneTimeUse: {
    type: Boolean,
    default: false
  },
}, { timestamps: true });

export const Coupon = mongoose.model("Coupon", couponSchema);