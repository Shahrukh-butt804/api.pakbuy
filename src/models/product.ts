import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: {
    type: [String],
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  category: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Category",
    required: true
  },
  xpro: {
    type: Boolean,
    default: false
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: null
  },
  length: {
    type: Number,
    default: null
  },
  color: {
    type: String,
    default: null
  }

}, { timestamps: true });

export const Product = mongoose.model("Product", productSchema);