import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";


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
      required: [true, "Phone Number is required"],
      validate: {
        validator: function (value: string) {
          return /^\d+$/.test(value);
        },
        message: "Phone Number must contain only numbers",
      },
    },
    image: {
      type: String,
      default: null,
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
    },
    paymentSource: {
      type: String,
      default: null,
    },
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
    const expiresIn: any = process.env.ACCESS_TOKEN_EXPIRY || "365d";

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
    const expiresIn: any = process.env.REFRESH_TOKEN_EXPIRY || "365d";
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

userSchema.plugin(aggregatePaginate);
export const User = mongoose.model("User", userSchema);
