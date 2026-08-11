import mongoose from "mongoose";
import { Cart } from "../../models/cart";
import { Collection } from "../../models/collection";



export class CollectionNotFoundError extends Error {
  constructor(nameOrId: string) {
    super(`Collection not found: ${nameOrId}`);
    this.name = "CollectionNotFoundError";
  }
}

async function resolveCollection(
  nameOrId: string
): Promise<{ id: string; price: number }> {

  if (mongoose.isValidObjectId(nameOrId)) {
    const byId: any = await Collection.findById(nameOrId)
      .select("_id CollectionPrice")
      .lean();
    if (byId) return { id: String(byId._id), price: byId.CollectionPrice ?? 0 };
  }

  const collection: any = await Collection.findOne({
    title: new RegExp(`^${nameOrId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("_id CollectionPrice title")
    .lean();

  if (!collection) throw new CollectionNotFoundError(nameOrId);
  return { id: String(collection._id), price: collection.CollectionPrice ?? 0 };
}

async function recalcAndSave(cart: any) {

  const ids = cart.items.map((i: any) => i.collection);
  const collections = await Collection.find({ _id: { $in: ids } })
    .select("_id CollectionPrice")
    .lean();

  const priceById = new Map(
    collections.map((c: any) => [String(c._id), c.CollectionPrice ?? 0])
  );

  let totalAmount = 0;
  cart.items.forEach((item: any) => {
    const price = priceById.get(String(item.collection)) ?? 0;
    item.subTotal = price * item.quantity;
    totalAmount += item.subTotal;
  });
  cart.totalAmount = totalAmount;

  await cart.save();
  return getCart(String(cart.user));
}

export async function getCart(userId: string) {
  const cart = await Cart.findOne({ user: userId })
    .populate({ path: "items.collection", select: "name title image CollectionPrice" })
    .lean();

  return cart || { user: userId, items: [], totalAmount: 0 };
}

export async function addToCart(
  userId: string,
  collectionTitleOrId: string,
  quantity = 1
) {
  const { id: collectionId, price } = await resolveCollection(collectionTitleOrId);

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [], totalAmount: 0 });
  }

  const existing = cart.items.find(
    (i: any) => String(i.collection) === collectionId
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      collection: collectionId as any,
      quantity,
      subTotal: price * quantity,
    });
  }

  return recalcAndSave(cart);
}

export async function updateQuantity(
  userId: string,
  collectionTitleOrId: string,
  quantity: number
) {
  const { id: collectionId } = await resolveCollection(collectionTitleOrId);
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return getCart(userId);

  if (quantity <= 0) {
    cart.items = cart.items.filter(
      (i: any) => String(i.collection) !== collectionId
    ) as any;
  } else {
    const existing = cart.items.find(
      (i: any) => String(i.collection) === collectionId
    );
    if (existing) existing.quantity = quantity;
  }

  return recalcAndSave(cart);
}

export async function removeFromCart(
  userId: string,
  collectionTitleOrId: string
) {
  const { id: collectionId } = await resolveCollection(
    collectionTitleOrId
  );

  const cart = await Cart.findOne({
    user: userId,
  });

  if (!cart) {
    return getCart(userId);
  }

  cart.items = cart.items.filter((item: any) => String(item.collection) !== String(collectionId)) as any;

  return recalcAndSave(cart);
}