import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";

import { addToCart, deleteFromCart, getMyCart, updateCart } from "../controllers/cart";

const cartRouter = Router();

cartRouter.route("/").get(verifyJWT, getMyCart);
cartRouter.route("/").post(verifyJWT, addToCart);
cartRouter.route("/").put(verifyJWT, updateCart);
cartRouter.route("/:id").delete(verifyJWT, deleteFromCart);

export default cartRouter;
