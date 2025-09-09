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

});

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  codes: [String],
  products: [productSchema]

})

packageSchema.pre("save", function (next) {
  const packageDoc = this;
  const total = packageDoc.products.reduce((sum, product) => sum + product.price, 0);
  packageDoc.price = total;
  next();
});

export const Package = mongoose.model("Package", packageSchema);