import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      minlength: [3, "min length must be 3 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is Required"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    shippingAddress: {
      type: String,
      required: true,
      trim: true,
    },
    instagramHandle: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    cosmetologyLicenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    stateOfIssuance: {
      type: String,
      trim: true,
    },
    currentAddress: {
      type: String,
      required: true,
      trim: true,
    },
    licensePhoto: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "password must be 8 characters Long"],
    },
    refreshToken: {
      type: String,
      default: null,
    },
    usedCoupons: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Coupon",
      default: [],
    },
    otp: {
      type: Number,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next): Promise<void> {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// CHECK THE PASSWORD FOR LOGIN
userSchema.methods.isPasswordCorrect = async function (
  password: string,
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};
// GENERATE ACCESS TOKEN
userSchema.methods.generateAccessToken = function () {
  try {
    const expiresIn: any = process.env.ACCESS_TOKEN_EXPIRY! || "15m";

    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        firstName: this.firstName,
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn },
    );
  } catch (error) {
    console.log("error while creating Access token", error);
    throw error;
  }
};

// GENERATE REFRESH TOKEN
userSchema.methods.generateRefreshToken = function () {
  try {
    const expiresIn: any = process.env.REFRESH_TOKEN_EXPIRY! || "30d";
    return jwt.sign(
      {
        _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn },
    );
  } catch (error) {
    console.log("error while creating Refresh token", error);
    throw error;
  }
};

export const User = mongoose.model("User", userSchema);
