import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  getMyProfile,
  updateProfile,
  delateProfile,
} from "../controllers/profile";
import { isAdmin } from "../middlewares/isAdmin.middlewre";

const profileRouter = Router();

profileRouter.route("/my-profile").get(verifyJWT, getMyProfile);
profileRouter.route("/update-profile").put(verifyJWT, updateProfile);

profileRouter.route("/delete-profile").delete(verifyJWT, delateProfile);

export default profileRouter;
