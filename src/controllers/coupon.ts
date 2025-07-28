import { Response } from "express";
import { tryCatch } from "../utils/tryCatch";
import { Coupon } from "../models/coupon";
import { User } from "../models/user";

const generateCoupon = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { code,
    type,
    discount,
    minOrderAmount,
    usageLimit,
    active,
    isOneTimeUse } = req.body


  const coupon = await Coupon.create({
    code,
    type,
    discount,
    minOrderAmount,
    usageLimit,
    active,
    isOneTimeUse,
  });

  if (!coupon) {
    return res.status(501).json({
      message: "something went wrong while creating user",
    });
  }

  return res.status(200).json({
    message: "Coupon generated successfully!",
    coupon,
  });


});

const getAllCoupons = tryCatch(async (req: any, res: Response): Promise<any> => {

  const coupons = await Coupon.find();

  return res.status(200).json({
    message: "Coupons fetched successfully!",
    coupons,
  });
})

const getCoupanById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }
  return res.status(200).json({
    message: "Coupon fetched successfully!",
    coupon,
  });
})

const deleteCoupon = tryCatch(
  async (req: any, res: Response): Promise<any> => {

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    return res.status(200).json({ message: "Coupon deleted successfully!" });
  },
);

const updateCoupon = tryCatch(
  async (req: any, res: Response): Promise<any> => {

    const { code,
      type,
      discount,
      minOrderAmount,
      usageLimit,
      active,
      isOneTimeUse } = req.body

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          code,
          type,
          discount,
          minOrderAmount,
          usageLimit,
          active,
          isOneTimeUse,
        },
      },
      {
        new: true,
      },
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    return res.status(200).json(
      {
        message: "Coupon updated successfully!",
        coupon,
      },
    )
  })


const useCoupon = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { code } = req.body

  const coupon: any = await Coupon.findOne({ code });
  console.log("🚀 ~ useCoupon ~ coupon:", coupon)

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  if (!coupon.active) {
    return res.status(400).json({ message: "Coupon is not active" });
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ message: "Coupon usage limit exceeded" });
  }

  if (coupon.isOneTimeUse) {
    if (req.user.usedCoupons.includes(coupon._id)) {
      return res.status(400).json({ message: "Coupon is already used" });
    }

    coupon.usedCount += 1;

    const user: any = await User.findById(req.user._id);
    console.log("🚀 ~ useCoupon ~ user:", user)
    user.usedCoupons.push(coupon._id);

    await coupon.save();
    await user.save();
  }

  // if (coupon.type === "percentage") {
  //   req.user.cart.totalAmount = req.user.cart.totalAmount - (req.user.cart.totalAmount * (coupon.discount / 100));
  // } else {
  //   req.user.cart.totalAmount = req.user.cart.totalAmount - coupon.discount;
  // }

  // await req.user.cart.save();
  // await req.user.save();

  return res.status(200).json({
    message: "Coupon applied successfully!",
    cart: req.user.cart,
  });


})

export {
  generateCoupon, useCoupon, getAllCoupons,
  getCoupanById,
  deleteCoupon,
  updateCoupon,
};
