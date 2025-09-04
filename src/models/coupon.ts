import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  value: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ["amount", "percentage"],
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  limit: {
    type: Number,
    required: true
  },
  perUserLimit: {
    type: Number,
    default: 1
  },
  description: {
    type: String
  },
  // minOrderValue: {
  //   type: Number,
  //   default: 0
  // },
  // canbeUsedBy: [
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "User"
  //   }
  // ],

  isActive: {
    type: Boolean,
    default: true
  },
  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ]
}, { timestamps: true });

export const Coupon = mongoose.model("Coupon", couponSchema);
