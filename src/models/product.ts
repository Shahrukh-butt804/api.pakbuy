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
  image: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  codes: [String],
  link: {
    type: String,
    default: null
  },
  retailPrice: {
    type: Number,
  },
  rating: {
    type: Number,
    default: 0
  },
  review: {
    type: Number,
    default: 0
  },

});


export const Product = mongoose.model("Product", productSchema);