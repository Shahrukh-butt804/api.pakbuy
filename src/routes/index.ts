import express from "express";
import authRouter from "./auth";
import cartRouter from "./cart";
import orderRouter from "./order";
import productRouter from "./product";
import profileRouter from "./profile";
import userManagementRouter from "./userManagement";
import contactRouter from "./contact";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/products", productRouter);
router.use("/contact-us", contactRouter);


router.use("/order", orderRouter);
router.use("/cart", cartRouter);


// admin routes
router.use("/admin/user-management", userManagementRouter);


export default router;
