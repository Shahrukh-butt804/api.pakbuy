import { Response } from "express";
import { Coupon } from "../models/coupon";
import { tryCatch } from "../utils/tryCatch";

const addCoupon = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { code, value, type, expiryDate, limit, perUserLimit, description, } = req.body;

  const coupon = await Coupon.create({
    code, value, type, expiryDate, limit, perUserLimit, description
  });

  if (!coupon) {
    return res.status(400).json({ message: "Something went wrong While adding coupon" });
  }

  res.status(200).json({
    message: "Coupon added successfully!",
    success: true,
  })

});

const updateCoupon = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { code, value, type, expiryDate, limit, perUserLimit, description, } = req.body;

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, {
    code, value, type, expiryDate, limit, perUserLimit, description
  }, { new: true });

  if (!coupon) {
    return res.status(400).json({ message: "Something went wrong While updating coupon" });
  }

  res.status(200).json({
    message: "Coupon updated successfully!",
    success: true,
  })


})

const getCoupons = tryCatch(async (req: any, res: Response): Promise<any> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword?.trim() || "";
  const skip = (page - 1) * limit;

  const searchQuery = keyword
    ? {
      $or: [
        { code: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [coupon, totalDocs] = await Promise.all([
    Coupon.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Coupon.countDocuments(searchQuery),
  ]);

  res.status(200).json({
    message: "Coupons fetched successfully!",
    coupon,
    pagination: {
      totalDocs,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });

});

const getCouponbyId = tryCatch(async (req: any, res: Response): Promise<any> => {

  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(400).json({ message: "coupon not found" });
  }

  res.status(200).json({
    coupon,
    message: "Coupon fetched successfully!",
    success: true,
  });
});

const deleteCoupon = tryCatch(async (req: any, res: Response): Promise<any> => {

  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return res.status(400).json({ message: "coupon not found" });
  }

  res.status(200).json({
    message: "Coupon deleted successfully!",
    success: true,
  });

});



export {
  addCoupon, deleteCoupon, getCouponbyId, getCoupons, updateCoupon
};

