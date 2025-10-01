import { Request, Response } from "express";
import { User } from "../models/user";
import { tryCatch } from "../utils/tryCatch";
import dayjs from "dayjs";
import { Payment } from "../models/payment";
import { Subscription } from "../models/subscription";
import { Order } from "../models/order";

const getReport = tryCatch(async (req: Request, res: Response): Promise<any> => {

  const now = dayjs();
  const monthStart = now.startOf('month').toDate();
  const monthEnd = now.endOf('month').toDate();

  const monthlyPayments = await Payment.find({
    createdAt: { $gte: monthStart, $lte: monthEnd }
  });
  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  // 2. New Users (last 30 days)
  const usersLastMonth = await User.find({ createdAt: { $gte: now.subtract(30, 'day').toDate() } });
  const newUsers = usersLastMonth.length;

  const newOrders = await Order.countDocuments({ status: "confirmed" });
  const dispatchedOrders = await Order.countDocuments({ status: "dispatched" });
  const deliveredOrders = await Order.countDocuments({ status: "delivered" });

  // 5. Orders Over Time (e.g., per hour in last 12 hours)
  const twelveHoursAgo = now.subtract(12, "hour").toDate();
  const orders = await Order.find({ createdAt: { $gte: twelveHoursAgo } });

  // Group by hour
  let ordersOverTime: { [hour: string]: number } = {};

  for (let i = 0; i < 6; i++) {
    // go back i hours from now
    const hourStart = dayjs().subtract(i, "hour").startOf("hour").toDate();
    const hourEnd = dayjs().subtract(i, "hour").endOf("hour").toDate();

    const count = orders.filter(
      (o) => o.createdAt >= hourStart && o.createdAt <= hourEnd
    ).length;

    // format hour label (show in order later)
    ordersOverTime[dayjs(hourStart).format("hh:00 A")] = count;
  }


  // 6. Recent Orders Table
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user')

  const recentOrderTable = recentOrders.map((order: any) => ({
    customer: order.user?.fullName || '',
    date: dayjs(order.createdAt).format("DD.MM.YYYY"),
    amount: order.totalAmount.toFixed(2) || 0,
    status: order.status,
  }));

  //   // Subscriptions funds
  const subscriptions = await Subscription.find();
  const totalSubscriptionsAmount = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const lastMonthOrders = await Order.find({
    createdAt: { $gte: monthStart, $lte: monthEnd }
  })

  const lastMonthSale = lastMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  res.status(200).json({
    success: true,
    monthlyRevenue: (monthlyRevenue / 100).toFixed(2) || "0.00",
    totalSubscriptionsRevenue: (totalSubscriptionsAmount / 100).toFixed(2) || "0.00",
    newUsers,
    orders: {
      new: newOrders,
      dispatched: dispatchedOrders,
      delivered: deliveredOrders,
    },
    ordersOverTime, // { "12:00 PM": 10, "01:00 PM": 22, ... }
    lastMonthSale,
    recentOrderTable,
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
        { fullName: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [Users, totalDocs] = await Promise.all([
    User.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(searchQuery),
  ]);

  res.status(200).json({
    message: "Users  fetched successfully!",
    Users,
    pagination: {
      totalDocs,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });

});

const getMembershipGrowth = tryCatch(async (req: any, res: Response): Promise<any> => {
  const weeksBack = Number(req.query.weeksBack) || 12;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeksBack * 7);

  const growth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          week: { $isoWeek: "$createdAt" }
        },
        members: { $sum: 1 }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.week": 1
      }
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        week: "$_id.week",
        members: 1
      }
    }
  ]);

  res.status(200).json({
    message: "Membership growth fetched successfully!",
    growth,
    weeksBack
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



export { getReport, getAllUsers, getUserById, toggleUserStatus, getMembershipGrowth };
