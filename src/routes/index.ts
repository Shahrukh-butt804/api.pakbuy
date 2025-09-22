import express from "express";
import authRouter from "./auth";
import cartRouter from "./cart";
import orderRouter from "./order";
import productRouter from "./product";
import profileRouter from "./profile";
import userManagementRouter from "./userManagement";
import contactRouter from "./contact";
import newsLetter from "./newLetter";
import resourcesRouter from "./resources";
import couponsRouter from "./coupons";
import collectionRouter from "./collection";
import { isActive } from "../middlewares/isActive";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", isActive, profileRouter);
router.use("/collections", isActive, collectionRouter);
router.use("/products", isActive, productRouter);
router.use("/contact-us", isActive, contactRouter);
router.use("/resource", isActive, resourcesRouter);
router.use("/coupons", isActive, couponsRouter);


router.use("/order", isActive, orderRouter);
router.use("/cart", isActive, cartRouter);
router.use("/news-letter", isActive, newsLetter);


// admin routes
router.use("/admin/user-management", isActive, userManagementRouter);


export default router;
