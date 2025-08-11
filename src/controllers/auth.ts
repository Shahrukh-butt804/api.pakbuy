import dotenv from "dotenv";
const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

import { Request, Response } from "express";
import Stripe from "stripe";
import { MemberShipPayment } from "../models/memberShipPayment";
import { User } from "../models/user";
import sendEmail from "../utils/nodeMailer";
import { tryCatch } from "../utils/tryCatch";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);


const signup = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    fullName,
    email,
    password,
    role,
    token
  } = req.body;

  const image = req.files?.image?.[0]?.path || null;

  // check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }


  // make payment
  const customer = await stripe.customers.create({
    email: email,
    source: token,
  });

  // Create the charge
  const charge = await stripe.charges.create({
    amount: Number(process.env.MEMBERSHIPCHARGES) * 100,
    currency: 'usd',
    description: "",
    customer: customer.id
  });


  if (charge.status !== "succeeded") {
    return res.status(400).json({ message: "payment Failed From Stripe" });
  }

  const payment = await MemberShipPayment.create({
    amount: Number(process.env.MEMBERSHIPCHARGES) * 100,
    paymentMethod: "Stripe",
    metaData: charge
  });

  if (!payment) {
    return res.status(500).json({ message: "Failed to create payment" });
  }


  const user = await User.create({
    fullName,
    email,
    password,
    image: image ? image : null,
    role
  });

  if (!user) {
    return res.status(501).json({
      message: "something went wrong while creating user",
    });
  }


  const result = await MemberShipPayment.findByIdAndUpdate(
    payment._id,
    {
      $set: {
        userId: user._id,
      },
    },
    {
      new: true,
    },
  )

  if (!result) {
    return res.status(500).json({ message: "Failed to update payment" });
  }

  res.status(200).json({
    message: " user created successfully!",
    success: true,
    user,
  });
});

const login = tryCatch(async (req: Request, res: Response): Promise<any> => {
  const { email, password, role } = req.body;

  console.log(email, password, role)

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide email and password" });
  }
  const user: any = await User.findOne({ email, role });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // check for user
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }


  if (user.isActive === false) {
    return res.status(401).json({ message: "User is blocked", success: false });
  }


  // generate JWT
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  res.status(200).json({
    message: "Logged in successfully!",
    success: true,
    user,
    accessToken,
    refreshToken,
  });
});

const logout = tryCatch(async (req: any, res: Response): Promise<any> => {
  await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: false,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      message: "Logged out successfully!",
      success: true,
    });
});

const forgotPassword = tryCatch(
  async (req: Request, res: Response): Promise<any> => {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    user.otp = otp;
    await user.save({ validateBeforeSave: false });

    const message = `Your Otp Verification Code is ${otp}`;

    const result = await sendEmail(user.email, "Password Reset Request", message);
    if (!result) {
      return res.status(500).json({ message: "Something went wrong" });
    }
    res.status(200).json({
      message: "Reset password email sent successfully!",
      success: true,
    });
  },
);

const verifyOtp = tryCatch(
  async (req: Request, res: Response): Promise<any> => {
    const { email, otp, role } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    res.status(200).json({
      message: "Otp Confirmed!",
      success: true,
    });
  },
);

const resetPassword = tryCatch(
  async (req: Request, res: Response): Promise<any> => {
    const { email, password, otp, role } = req.body;

    if (!email || !password || !otp) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const user: any = await User.findOne({ email, role });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    user.otp = null;
    user.password = password;
    await user.save();

    res.status(200).json({
      message: "Password Reset Successfully!",
      success: true,
    });
  },
);

const changePassword = tryCatch(
  async (req: any, res: Response): Promise<any> => {
    const { oldPassword, newPassword } = req.body;
    const user: any = await User.findById(req.user._id).select("-otp");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check for user
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Wrong Old Password" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully!",
      success: true,
      user,
    });
  },
);

export {
  changePassword,
  forgotPassword,
  login,
  logout,
  resetPassword,
  signup,
  verifyOtp
};

