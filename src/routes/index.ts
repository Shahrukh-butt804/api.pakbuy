import express from "express";
import authRouter from "./auth";
import profileRouter from "./profile";
import productRouter from "./product";
import cartRouter from "./cart";
import couponRouter from "./coupon";
import categoryRouter from "./category";
import orderRouter from "./order";
import userManagementRouter from "./userManagement";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);


router.use("/products", productRouter);
router.use("/order", orderRouter);
router.use("/cart", cartRouter);
router.use("/coupon", couponRouter);
router.use("/category", categoryRouter);


// admin routes
router.use("/admin/user-management", userManagementRouter);


export default router;
