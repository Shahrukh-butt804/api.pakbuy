import { Request, Response } from "express";
import { EmailTemplate } from "../models/emailTemplate";
import { tryCatch } from "../utils/tryCatch";

const getEmailTemplate = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const template = await EmailTemplate.find();

  if (!template) {
    return res.status(404).json({ message: "Email template not found" });
  }

  res.status(200).json({
    success: true,
    message: "Email template fetched successfully!",
    template,
  });

});

const addEmailTemplate = tryCatch(async (req: Request, res: Response): Promise<any> => {

  const { body, name } = req.body;

  if (!body) {
    return res.status(400).json({ message: "Please provide Email Body" });
  }

  const template = await EmailTemplate.create({ name, body });

  if (!template) {
    return res.status(404).json({ message: "something went wrong while adding email template" });
  }

  res.status(200).json({
    success: true,
    message: "Email template added successfully!",
    template,
  });

});

const updateEmailTemplate = tryCatch(async (req: any, res: Response): Promise<any> => {

  const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
    req.params.id,
    { body: req.body.body, name: req.body.name },
    { new: true }
  );

  if (!updatedTemplate) {
    return res.status(404).json({ message: "Email template not found" });
  }

  res.status(200).json({
    success: true,
    message: "Email template updated successfully!",
    template: updatedTemplate,
  })

});

const deleteEmailTemplate = tryCatch(async (req: any, res: Response): Promise<any> => {

  const deletedTemplate = await EmailTemplate.findByIdAndDelete(req.params.id);

  if (!deletedTemplate) {
    return res.status(404).json({ message: "Email template not found" });
  }

  res.status(200).json({
    success: true,
    message: "Email template deleted successfully!",
    template: deletedTemplate,
  })

});

export { getEmailTemplate, addEmailTemplate, updateEmailTemplate, deleteEmailTemplate };

