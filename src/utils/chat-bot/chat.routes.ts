import { Router } from "express";
import { handleChat } from "./chat.controller";
import { verifyJWT } from "../../middlewares/auth.middleware";

const chatBotRouter = Router();

chatBotRouter.route("/").post(verifyJWT, handleChat);

export { chatBotRouter };