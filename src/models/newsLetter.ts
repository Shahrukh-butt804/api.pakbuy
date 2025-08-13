import mongoose from "mongoose";

const newsLetterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
});

export const NewsLetter = mongoose.model("NewsLetter", newsLetterSchema);