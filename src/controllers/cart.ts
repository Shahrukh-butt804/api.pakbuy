import { Response } from "express";
import { Cart } from "../models/cart";
import { tryCatch } from "../utils/tryCatch";
import { Collection } from "../models/collection";

const addToCart = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { collectionId, quantity } = req.body;

  if (!collectionId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    return res.status(400).json({ message: "Invalid collection or quantity" });
  }

  const collection: any = await Collection.findById(collectionId)
    .select("_id title CollectionPrice")
    .lean();

  if (!collection) {
    return res.status(404).json({
      message: "Collection not found",
    });
  }

  const qty = Number(quantity);

  let cart: any = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [
        {
          collection: collection._id,
          quantity: qty,
          subTotal: collection.CollectionPrice * qty,
        },
      ],
      totalAmount: collection.CollectionPrice * qty,
    });

    return res.status(200).json({
      success: true,
      message: "Collection added to cart successfully!",
      cart,
    });
  }

  const existingCartItem = cart.items.find(
    (item: any) =>
      String(item.collection) === String(collection._id)
  );

  if (existingCartItem) {
    existingCartItem.quantity += qty;
    existingCartItem.subTotal =
      collection.CollectionPrice * existingCartItem.quantity;
  } else {
    cart.items.push({
      collection: collection._id,
      quantity: qty,
      subTotal: collection.CollectionPrice * qty,
    });
  }

  // Recalculate total
  cart.totalAmount = cart.items.reduce(
    (total: number, item: any) => total + item.subTotal,
    0
  );

  await cart.save();

  return res.status(200).json({
    success: true,
    message: "Collection added to cart successfully!",
    cart,
  });
});

const updateCart = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { collectionId, quantity } = req.body;

  if (
    !collectionId ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 1
  ) {
    return res.status(400).json({
      message: "Invalid collection or quantity",
    });
  }

  const qty = Number(quantity);

  const collection: any = await Collection.findById(collectionId)
    .select("_id CollectionPrice")
    .lean();

  if (!collection) {
    return res.status(404).json({
      message: "Collection not found",
    });
  }

  const cart: any = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    return res.status(404).json({
      message: "Cart not found",
    });
  }

  const existingCartItem = cart.items.find(
    (item: any) =>
      String(item.collection) === String(collectionId)
  );

  if (!existingCartItem) {
    return res.status(404).json({
      message: "Collection not found in cart",
    });
  }

  existingCartItem.quantity = qty;

  existingCartItem.subTotal =
    collection.CollectionPrice * qty;

  // Recalculate total
  cart.totalAmount = cart.items.reduce(
    (total: number, item: any) => total + item.subTotal,
    0
  );

  await cart.save();

  return res.status(200).json({
    message: "Cart updated successfully!",
    cart,
  });
});

const getMyCart = tryCatch(async (req: any, res: Response): Promise<any> => {
  const cart: any = await Cart.findOne({
    user: req.user._id,
  }).populate({
    path: "items.collection",
    select: "_id title name image CollectionPrice",
  });

  if (!cart) {
    return res.status(404).json({
      message: "Cart not found",
    });
  }

  return res.status(200).json({
    message: "Cart fetched successfully!",
    cart,
  });
});

const deleteFromCart = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { id } = req.params;

  const cart: any = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    return res.status(404).json({
      message: "Cart not found",
    });
  }

  const itemExists = cart.items.some(
    (item: any) =>
      String(item.collection) === String(id)
  );

  if (!itemExists) {
    return res.status(404).json({
      message: "Collection not found in cart",
    });
  }

  // Completely remove the collection from cart
  cart.items = cart.items.filter(
    (item: any) =>
      String(item.collection) !== String(id)
  );

  // Recalculate total after removing item
  cart.totalAmount = cart.items.reduce(
    (total: number, item: any) => total + item.subTotal,
    0
  );

  await cart.save();

  return res.status(200).json({
    message: "Collection removed from cart successfully!",
    cart,
  });
}
);


export {
  addToCart, deleteFromCart, getMyCart,
  updateCart
};

