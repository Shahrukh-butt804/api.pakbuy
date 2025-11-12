import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    body: {
      type: String,
      required: true
    },
  },
  { timestamps: true }
);

export const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);