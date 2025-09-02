import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export const Resource = mongoose.model("Resource", resourceSchema);