import { Response } from "express";
import { Category } from "../models/category";
import { tryCatch } from "../utils/tryCatch";

const addCategory = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { name, description } = req.body

  if (!name) {
    return res.status(400).json({
      message: "name is required",
    });
  }

  const category = await Category.create({
    name, description
  });

  if (!category) {
    return res.status(501).json({
      message: "something went wrong while creating category",
    });
  }

  return res.status(200).json({
    message: "category added successfully!",
    success: true,
    category,
  });


});

const updateCategory = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { name, description } = req.body

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name, description
      },
    },
    {
      new: true,
    },
  );

  if (!category) {
    return res.status(501).json({
      message: "something went wrong while Updating category",
    });
  }

  return res.status(200).json({
    message: "category updated successfully!",
    success: true,
    category,
  });


});

const getAllCategories = tryCatch(async (req: any, res: Response): Promise<any> => {


  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword?.trim() || "";
  const skip = (page - 1) * limit;

  const searchQuery = keyword
    ? {
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [categories, totalCount] = await Promise.all([
    Category.find(searchQuery).skip(skip).limit(limit),
    Category.countDocuments(searchQuery),
  ]);


  return res.status(200).json({
    message: "categories fetched successfully!",
    totalCount,
    categories,
  });
})

const getCategoryById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ message: "category not found" });
  }
  return res.status(200).json({
    message: "category fetched successfully!",
    category,
  });
})

const deleteCategory = tryCatch(
  async (req: any, res: Response): Promise<any> => {

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "category not found" });
    }
    return res.status(200).json({
      message: "category deleted successfully!",
      success: true
    });
  },
);




export {
  addCategory, deleteCategory, getAllCategories,
  getCategoryById, updateCategory
};

