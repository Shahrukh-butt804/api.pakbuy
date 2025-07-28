import express from "express";
import authRouter from "./auth";
import cartRouter from "./cart";
import orderRouter from "./order";
import productRouter from "./product";
import profileRouter from "./profile";
import userManagementRouter from "./userManagement";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/products", productRouter);


router.use("/order", orderRouter);
router.use("/cart", cartRouter);


// admin routes
router.use("/admin/user-management", userManagementRouter);


export default router;
