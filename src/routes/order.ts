import { Router } from "express";
import { createOrder, deleteOrder, getAllOrder, getOrderById, getOrderByUser } from "../controllers/order";
import { validateOrder } from "../validations/order.validation";
import { handleValidationErrors } from "../validations/user.validation";
import { verifyJWT } from "../middlewares/auth.middleware";
import { isLoggedIn } from "../middlewares/isLoggedIn..middleware";

const orderRouter = Router();

orderRouter.route("/create-order").post(validateOrder, handleValidationErrors, verifyJWT, createOrder);
orderRouter.route("/get-all-orders").get(getAllOrder);
orderRouter.route("/get-order-by-id/:id").get(getOrderById);
orderRouter.route("/get-order-by-user").get(verifyJWT, getOrderByUser);
orderRouter.route("/delete-order/:id").delete(deleteOrder);

export default orderRouter;
