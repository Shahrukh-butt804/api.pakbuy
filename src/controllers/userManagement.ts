import { Request, Response } from "express";
import { User } from "../models/user";
import { tryCatch } from "../utils/tryCatch";
import dayjs from "dayjs";
import { Payment } from "../models/payment";
import { Subscription } from "../models/subscription";

const getReport = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const totalUsers = await User.countDocuments();

  if (!totalUsers) {
    return res.status(404).json({ message: "No users found" });
  }

  // Prepare 6 months ago date
  const now = dayjs();
  const sixMonthsAgo = now.subtract(5, 'month').startOf('month').toDate();

  // Fetch users created in the last 6 months
  const lastSixMonthsData = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1
      }
    }
  ]);

  // Purchases funds
  const payments = await Payment.find();
  const totalPurchasesAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Subscriptions funds
  const subscriptions = await Subscription.find();
  const totalSubscriptionsAmount = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  // Format data to show month name and user counts
  const formattedData = Array.from({ length: 6 }).map((_, i) => {
    const targetMonth = now.subtract(5 - i, "month");
    const match = lastSixMonthsData.find(
      (d) => d._id.month === targetMonth.month() + 1 && d._id.year === targetMonth.year()
    );

    return {
      month: targetMonth.format("MMMM YYYY"),
      users: match?.count || 0,
    };
  });

  res.status(200).json({
    success: true,
    message: "User report fetched successfully",
    totalUsers,
    purchasesFunds: totalPurchasesAmount.toFixed(2),
    subscriptionFunds: totalSubscriptionsAmount.toFixed(2),
    recentSixMonths: formattedData,
  });
});

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



export { getReport, getAllUsers, getUserById, toggleUserStatus };
