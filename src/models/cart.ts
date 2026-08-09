import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    subTotal: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { timestamps: true }
);

export const Cart = mongoose.model("Cart", cartSchema);