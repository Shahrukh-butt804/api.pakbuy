import { Router } from "express";
import { addToNewsLetter } from "../controllers/newLetter";

const newsLetter = Router();

newsLetter.route("/add-to-news-letter").post(addToNewsLetter);

export default newsLetter;
