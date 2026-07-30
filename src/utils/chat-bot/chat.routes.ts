import { Router } from "express";
import { handleChat } from "./chat.controller";

const chatBotRouter = Router();

chatBotRouter.route("/").post(handleChat);

export { chatBotRouter };