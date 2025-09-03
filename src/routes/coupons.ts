import { Router } from "express";
import { addCoupon, deleteCoupon, getCouponbyId, getCoupons, updateCoupon } from "../controllers/coupons";
import { couponValidation } from "../validations/coupon-validation";
import { handleValidationErrors } from "../validations/user.validation";


const couponsRouter = Router();

couponsRouter.route("/add-coupon").post(couponValidation, handleValidationErrors, addCoupon);
couponsRouter.route("/update-coupon/:id").put(updateCoupon);
couponsRouter.route("/get-all-coupons").get(getCoupons);
couponsRouter.route("/get-coupon-by-id/:id").get(getCouponbyId);
couponsRouter.route("/delete-coupon/:id").delete(deleteCoupon);




export default couponsRouter;
