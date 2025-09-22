import { Router } from "express";
import { addCoupon, deleteCoupon, getCouponbyId, getCoupons, toggleTokenStatus, updateCoupon, validateCoupon } from "../controllers/coupons";
import { couponValidation } from "../validations/coupon-validation";
import { handleValidationErrors } from "../validations/user.validation";
import { isAdmin } from "../middlewares/isAdmin..middleware";


const couponsRouter = Router();

couponsRouter.route("/add-coupon").post(isAdmin, couponValidation, handleValidationErrors, addCoupon);
couponsRouter.route("/update-coupon/:id").put(isAdmin, updateCoupon);
couponsRouter.route("/get-all-coupons").get(isAdmin, getCoupons);
couponsRouter.route("/get-coupon-by-id/:id").get(isAdmin, getCouponbyId);
couponsRouter.route("/delete-coupon/:id").delete(isAdmin, deleteCoupon);
couponsRouter.route("/toggle-coupon-status/:id").put(isAdmin, toggleTokenStatus);
couponsRouter.route("/validate-coupon").post(validateCoupon);




export default couponsRouter;
