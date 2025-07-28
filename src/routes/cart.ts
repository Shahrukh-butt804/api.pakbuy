import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";

import { addToCart, deleteFromCart, getMyCart, updateCart } from "../controllers/cart";

const cartRouter = Router();

cartRouter.route("/get-my-cart").get(verifyJWT, getMyCart);
cartRouter.route("/add-to-cart").post(verifyJWT, addToCart);
cartRouter.route("/update-cart").put(verifyJWT, updateCart);
cartRouter.route("/delete-from-cart/:id").delete(verifyJWT, deleteFromCart);

export default cartRouter;
