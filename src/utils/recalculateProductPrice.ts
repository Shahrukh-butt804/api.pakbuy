// utils/recalcCollectionPrice.ts
import mongoose from "mongoose";
import { HydratedDocument } from "mongoose";

export interface ICollection {
  name: string;
  description: string;
  CollectionPrice: number;
  image: string;
  products: mongoose.Types.ObjectId[];
}

export async function recalcPrice(doc: HydratedDocument<ICollection>) {
  console.log("Recalculating CollectionPrice for collection:", doc);
  if (!doc.products || doc.products.length === 0) {
    doc.CollectionPrice = 0;
    return;
  }


  // fetch all product prices
  const products = await mongoose.model("Product").find(
    { _id: { $in: doc.products } },
    "price"
  );

  const total = products.reduce((sum, p) => sum + (p.price || 0), 0);
  doc.CollectionPrice = total;
}
