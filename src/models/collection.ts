import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  CollectionPrice: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    required: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }]

})

export const Collection = mongoose.model("Collection", collectionSchema);