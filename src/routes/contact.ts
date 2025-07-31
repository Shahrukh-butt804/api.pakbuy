import { Router } from "express";
import { submit } from "../controllers/contact";


const contactRouter = Router();

contactRouter.route("/send-contact").post(submit);

export default contactRouter;
