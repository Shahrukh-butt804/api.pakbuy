import { Router } from "express";
import { createOrder, deleteOrder, getAllOrder, getOrderById, getOrderByUser, getStripeKeys, updateOrderStatus } from "../controllers/order";
import { verifyJWT } from "../middlewares/auth.middleware";
import { validateOrder } from "../validations/order.validation";
import { handleValidationErrors } from "../validations/user.validation";

const orderRouter = Router();

orderRouter.route("/get-stripe-keys").get(getStripeKeys);
orderRouter.route("/create-order").post(validateOrder, handleValidationErrors, verifyJWT, createOrder);
orderRouter.route("/get-all-orders").get(getAllOrder);
orderRouter.route("/get-order-by-id/:id").get(getOrderById);
orderRouter.route("/get-order-by-user").get(verifyJWT, getOrderByUser);
orderRouter.route("/delete-order/:id").delete(deleteOrder);
orderRouter.route("/update-order-status/:id").put(updateOrderStatus);

export default orderRouter;
