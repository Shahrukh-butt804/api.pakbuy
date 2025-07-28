import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  resetPassword,
  signup,
  verifyOtp,
} from "../controllers/auth";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  handleValidationErrors,
  validateUser,
} from "../validations/user.validation";

import uploads from "../utils/multer";

const authRouter = Router();

authRouter.route("/signup").post(uploads.licenseUpload, validateUser, handleValidationErrors, signup);
authRouter.route("/login").post(login);
authRouter.route("/logout").post(verifyJWT, logout);

authRouter.route("/forgot-password").post(forgotPassword);
authRouter.route("/verify-otp").post(verifyOtp);
authRouter.route("/reset-password").post(resetPassword);
authRouter.route("/change-password").post(verifyJWT, changePassword);

export default authRouter;
