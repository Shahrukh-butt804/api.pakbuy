import { Response } from "express";
import { User } from "../models/user";
import { tryCatch } from "../utils/tryCatch";

const getMyProfile = tryCatch(async (req: any, res: Response): Promise<any> => {
  res.status(200).json({
    message: "User Profile",
    user: req.user,
  });
});

const updateProfile = tryCatch(
  async (req: any, res: Response): Promise<any> => {
    const { fullName } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          fullName,
        },
      },
      {
        new: true,
      },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully!",
      user,
    });
  },
);

const delateProfile = tryCatch(
  async (req: any, res: Response): Promise<any> => {
    const user = req.user;
    const { id } = req.query;

    if (user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to delete user" });
    }

    if (!id) {
      return res.status(400).json({ message: "Please provide user ID" });
    }

    const loggedInUser = await User.findById(id);

    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await loggedInUser.deleteOne();

    res.status(200).json({
      message: "Profile deleted successfully!",
      user,
    });
  },
);

export { getMyProfile, updateProfile, delateProfile };
