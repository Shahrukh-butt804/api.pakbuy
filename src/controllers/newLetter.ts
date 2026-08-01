import { Response } from "express";
import { NewsLetter } from "../models/newsLetter";
import { tryCatch } from "../utils/tryCatch";
import { newsletterRegistration } from "../utils/nodeMailer";

const addToNewsLetter = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please provide email" });
  }

  const newsLetter = await NewsLetter.findOne({ email });
  if (newsLetter) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const newNewsLetter = await NewsLetter.create({ email });

  if (!newNewsLetter) {
    return res.status(400).json({ message: "Something went wrong please try again" });
  }

  await newsletterRegistration(email, "Welcome to Choose Well Newsletter!");

  return res.status(200).json({
    message: "subscribed successfully",
    success: true,
  });

});

export { addToNewsLetter };
