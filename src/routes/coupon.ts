import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";

import { deleteCoupon, generateCoupon, getAllCoupons, getCoupanById, updateCoupon, useCoupon } from "../controllers/coupon";

const couponRouter = Router();

// Admin Routes
couponRouter.route("/generate-coupon").post(verifyJWT, generateCoupon);
couponRouter.route("/get-all-coupons").get(verifyJWT, getAllCoupons);
couponRouter.route("/get-coupon-by-id/:id").get(verifyJWT, getCoupanById);
couponRouter.route("/update-coupon/:id").put(verifyJWT, updateCoupon);
couponRouter.route("/delete-coupon/:id").delete(verifyJWT, deleteCoupon);


couponRouter.route("/use-coupon").post(verifyJWT, useCoupon);






export default couponRouter;
