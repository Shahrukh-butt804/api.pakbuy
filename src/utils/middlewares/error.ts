import { NextFunction, Response, Request } from "express";

interface ErrorResponse {
  message: string;
  stack?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction,
) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);

  const responseBody = {
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "" : err.stack,
  };

  console.error("Error:", responseBody);
  res.json(responseBody);
}
