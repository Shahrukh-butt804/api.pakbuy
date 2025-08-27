import { Router } from "express";
import {
  delateProfile,
  getMyProfile,
  updateProfile,
} from "../controllers/profile";
import { verifyJWT } from "../middlewares/auth.middleware";
import uploads from "../utils/multer";

const profileRouter = Router();

profileRouter.route("/my-profile").get(verifyJWT, getMyProfile);
profileRouter.route("/update-profile").put(verifyJWT, uploads.profileUpload, updateProfile);

profileRouter.route("/delete-profile").delete(verifyJWT, delateProfile);

export default profileRouter;
