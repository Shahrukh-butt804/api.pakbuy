import { Response } from "express";
import { tryCatch } from "../utils/tryCatch";
import { Contact } from "../models/contact";
import { sendContactUsEmail } from "../utils/nodeMailer";

const submit = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, email, subject, message
  } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "Please provide all required fields" });
  }

  const contact = await Contact.create({
    name, email, subject, message
  });

  if (!contact) {
    return res.status(400).json({ message: "Something went wrong" });
  }


  const result = await sendContactUsEmail({
    name,
    email,
    subject,
    message,
  });

  if (!result) {
    return res.status(400).json({ message: "Something went wrong while sending email" });
  }

  res.status(200).json({
    message: "Form submitted successfully!",
    success: true,
    contact
  });


});


export {
  submit
};

