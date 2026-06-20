import express, { Request, Response } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db";
import credentials from "./config/ssl";
import https from "https";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { errorHandler } from "./utils/middlewares/error";
import { AppError } from "./utils/appError";
import corsOptions from "./config/cors";

const app = express();

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
app.use(helmet());

// SSL
var httpsServer;
if (process.env.NODE_ENV === "customdev")
  httpsServer = https.createServer(credentials, app);
else httpsServer = http.createServer(app);

const PORT = process.env.PORT || 3000;

connectDB();

const lastDeployAt = new Date();

//limiting the api calls
const limiter = rateLimit({
  max: 1000000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

//static routes
app.use("/Uploads", express.static("./Uploads"));

app.get("/", (req: Request, res: Response) => {
  res.send(`Choose Well Is Running on Port ${PORT}, last deployed at ${lastDeployAt}`);
});

// routes register
app.use("/api/v1", router);
app.all("*", (req: Request, res: Response) => {
  throw new AppError(
    "",
    404,
    `Can't find ${req.originalUrl} on this server!`,
    true,
  );
});

app.use(errorHandler);

httpsServer.listen(PORT, () => {
  console.log(`Choose Well is running on Port: ${PORT},last deployed at ${lastDeployAt}`);
});
