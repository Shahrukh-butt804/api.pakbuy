import { Request, Response } from "express";
import { User } from "../models/user";
import { tryCatch } from "../utils/tryCatch";

const getAllUsers = tryCatch(async (req: any, res: Response): Promise<any> => {

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword?.trim() || "";
  const skip = (page - 1) * limit;

  const searchQuery = keyword
    ? {
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [Users, totalCount] = await Promise.all([
    User.find(searchQuery).skip(skip).limit(limit),
    User.countDocuments(searchQuery),
  ]);

  res.status(200).json({
    message: "Users  fetched successfully!",
    totalCount,
    Users,
  });

});

const getUserById = tryCatch(async (req: Request, res: Response): Promise<any> => {

  const user = await User.findById(req.params.id);
  res.status(200).json({
    message: "User  fetched successfully!",
    user,
  });

});

const toggleUserStatus = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const user: any = await User.findById(req.params.id);
  user.isActive = !user.isActive;
  await user.save({ revalidateBeforeSave: false });
  res.status(200).json({
    message: "User Status Changed Successfully!",
    success: true,
    user,
  });
});



export { getAllUsers, getUserById, toggleUserStatus };
