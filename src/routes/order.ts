import { Router } from "express";
import { createOrder, deleteOrder, getAllOrder, getOrderById, getOrderByUser, getStripeKeys, updateOrderStatus } from "../controllers/order";
import { verifyJWT } from "../middlewares/auth.middleware";
import { validateOrder } from "../validations/order.validation";
import { handleValidationErrors } from "../validations/user.validation";
import { isAdmin } from "../middlewares/isAdmin..middleware";

const orderRouter = Router();

orderRouter.route("/get-stripe-keys").get(getStripeKeys);
orderRouter.route("/create-order").post(validateOrder, handleValidationErrors, verifyJWT, createOrder);
orderRouter.route("/get-all-orders").get(isAdmin, getAllOrder);
orderRouter.route("/get-order-by-id/:id").get(getOrderById);
orderRouter.route("/get-order-by-user").get(verifyJWT, getOrderByUser);
orderRouter.route("/delete-order/:id").delete(isAdmin, deleteOrder);
orderRouter.route("/update-order-status/:id").put(isAdmin, updateOrderStatus);

export default orderRouter;
