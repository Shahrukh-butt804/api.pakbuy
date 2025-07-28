import { Router } from "express";

import { getAllUsers, getUserById, toggleUserStatus } from "../controllers/userManagement";

const userManagementRouter = Router();

userManagementRouter.route("/get-all-users").get(getAllUsers);
userManagementRouter.route("/get-user-by-id/:id").get(getUserById);
userManagementRouter.route("/toggle-user-status/:id").put(toggleUserStatus);

export default userManagementRouter;
