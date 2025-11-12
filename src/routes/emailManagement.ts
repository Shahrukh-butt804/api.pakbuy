import { Router } from "express";

import { addEmailTemplate, deleteEmailTemplate, getEmailTemplate, updateEmailTemplate } from "../controllers/emailManagement";
import { isAdmin } from "../middlewares/isAdmin..middleware";

const emailManagementRouter = Router();

emailManagementRouter.route("/get-email-template").get(isAdmin, getEmailTemplate);
emailManagementRouter.route("/add-email-template").post(isAdmin, addEmailTemplate);
emailManagementRouter.route("/update-email-template/:id").put(isAdmin, updateEmailTemplate);
emailManagementRouter.route("/delete-email-template/:id").delete(isAdmin, deleteEmailTemplate);

export default emailManagementRouter;
