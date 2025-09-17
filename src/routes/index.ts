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

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/collections", collectionRouter);
router.use("/products", productRouter);
router.use("/contact-us", contactRouter);
router.use("/resource", resourcesRouter);
router.use("/coupons", couponsRouter);


router.use("/order", orderRouter);
router.use("/cart", cartRouter);
router.use("/news-letter", newsLetter);


// admin routes
router.use("/admin/user-management", userManagementRouter);


export default router;
