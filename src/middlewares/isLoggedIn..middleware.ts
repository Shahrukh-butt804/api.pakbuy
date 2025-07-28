import jwt, { JwtPayload } from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { User } from "../models/user";
import { tryCatch } from "../utils/tryCatch";

export const isLoggedIn = tryCatch(
  async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const token: string | undefined =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        req.user = false;
        return next();
      }

      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string,
      ) as JwtPayload;

      if (!decodedToken || !decodedToken._id) {
        return res.status(401).json({
          success: false,
          message: "Invalid Access Token",
        });
      }

      const user: any = await User.findById(decodedToken._id).select(
        "-password -refreshToken -otp",
      );

      if (!user) {
        req.user = false;
        return next();
      }

      req.user = user;
      next();
    } catch (error: any) {
      console.error(error);
      req.user = false;
      return next()
    }
  },
);
