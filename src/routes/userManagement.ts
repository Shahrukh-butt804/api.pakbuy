import { Router } from "express";

import { getAllUsers, getMembershipGrowth, getReport, getUserById, toggleUserStatus } from "../controllers/userManagement";
import { isAdmin } from "../middlewares/isAdmin..middleware";

const userManagementRouter = Router();

userManagementRouter.route("/get-report").get(isAdmin, getReport);
userManagementRouter.route("/get-membership-growth").get(isAdmin, getMembershipGrowth);
userManagementRouter.route("/get-all-users").get(isAdmin, getAllUsers);
userManagementRouter.route("/get-user-by-id/:id").get(isAdmin, getUserById);
userManagementRouter.route("/toggle-user-status/:id").put(isAdmin, toggleUserStatus);

export default userManagementRouter;
