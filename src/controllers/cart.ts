import { Response } from "express";
import { Cart } from "../models/cart";
import { tryCatch } from "../utils/tryCatch";
import { Collection } from "../models/collection";

const addToCart = tryCatch(async (req: any, res: Response): Promise<any> => {

  const {
    productId, quantity,
  } = req.body;

  if (!productId || isNaN(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Invalid product or quantity" });
  }

  const product: any = await Collection.findById(productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const cart: any = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    const newCart = await Cart.create({
      user: req.user._id,
      items: [
        {
          product: product._id,
          quantity,
          price: product.price,
        },
      ],
      totalAmount: product.price * quantity,
    });
    return res.status(200).json({
      message: "Product added to cart successfully!",
      cart: newCart,
    });
  }

  const existingCartItem = cart.items.find(
    (item: any) => item.product.toString() === productId,
  );

  if (existingCartItem) {
    existingCartItem.quantity += quantity;

  }
  else {
    const cartItem = {
      product: product._id,
      quantity,
      price: product.price,
    };

    cart.items.push(cartItem);

  }

  cart.totalAmount += product.price * quantity;
  await cart.save();

  return res.status(200).json({
    message: "Product added to cart successfully!",
    cart,
  });

});

const updateCart = tryCatch(async (req: any, res: Response): Promise<any> => {

  const {
    productId, quantity,
  } = req.body;

  if (!productId || isNaN(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Invalid product or quantity" });
  }

  const cart: any = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  cart.items.forEach((item: any) => {
    if (item.product.toString() === productId) {
      item.quantity = quantity;
    }
  });

  cart.totalAmount = 0;
  cart.items.forEach((item: any) => {
    cart.totalAmount += item.price * item.quantity;
  });

  await cart.save();
  return res.status(200).json({
    message: "Cart Updated Successfully!",
    cart,
  });

});

const getMyCart = tryCatch(async (req: any, res: Response): Promise<any> => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  return res.status(200).json({
    message: "cart fetched successfully!",
    cart,
  });

});

const deleteFromCart = tryCatch(
  async (req: any, res: Response): Promise<any> => {

    const cart: any = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const filteredItems = cart.items.filter((item: any) => item.product.toString() !== req.params.id);
    if (filteredItems.length === cart.items.length) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.totalAmount = 0;
    cart.items.forEach((item: any) => {
      cart.totalAmount += item.price * item.quantity;
    });

    cart.items = filteredItems;
    await cart.save();
    return res.status(200).json({
      message: "Product deleted from cart successfully!",
      cart,
    });

  });


export {
  addToCart, deleteFromCart, getMyCart,
  updateCart
};

