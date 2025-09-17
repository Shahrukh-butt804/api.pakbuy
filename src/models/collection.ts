import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  image: {
    type: String,
    required: true
  },
  // discountPrice: {
  //   type: Number,
  //   default: 0
  // },
  description: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  codes: [String],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }]

})

export const Collection = mongoose.model("Collection", collectionSchema);