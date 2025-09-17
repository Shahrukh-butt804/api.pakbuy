import mongoose, { HydratedDocument } from "mongoose";
import { recalcPrice } from "../utils/recalculateProductPrice";


export interface ICollection {
  name: string;
  description: string;
  CollectionPrice: number;
  image: string;
  products: mongoose.Types.ObjectId[];
}


const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
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


collectionSchema.pre("save", async function (next) {
  const doc = this as HydratedDocument<ICollection>;
  await recalcPrice(doc);
  next();
});


async function postUpdateHook(
  this: mongoose.Query<any, any>,
  doc: HydratedDocument<ICollection> | null
) {
  if (!doc) return;

  const update = this.getUpdate() as any;

  if (
    update?.$addToSet?.products ||
    update?.$push?.products ||
    update?.$pull?.products ||
    update?.products
  ) {

    await recalcPrice(doc);

    await mongoose.model("Collection").updateOne(
      { _id: doc._id },
      { $set: { CollectionPrice: doc.CollectionPrice } }
    );
  }
}


collectionSchema.post("updateMany", async function (res) {
  const filter = this.getFilter();
  const docs = await mongoose.model("Collection").find(filter);

  for (const doc of docs) {
    await recalcPrice(doc as HydratedDocument<ICollection>);
    await mongoose.model("Collection").updateOne(
      { _id: doc._id },
      { $set: { CollectionPrice: doc.CollectionPrice } }
    );
  }
});


collectionSchema.post("findOneAndUpdate", postUpdateHook);
collectionSchema.post(/findOneAndUpdate|findByIdAndUpdate/, postUpdateHook);


export const Collection = mongoose.model("Collection", collectionSchema);