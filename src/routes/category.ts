import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";

import { addCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "../controllers/category";

const categoryRouter = Router();

// Admin Routes
categoryRouter.route("/add-category").post(verifyJWT, addCategory);
categoryRouter.route("/update-category/:id").put(verifyJWT, updateCategory);
categoryRouter.route("/get-all-categories").get(verifyJWT, getAllCategories);
categoryRouter.route("/get-category-by-id/:id").get(verifyJWT, getCategoryById);
categoryRouter.route("/delete-category/:id").delete(verifyJWT, deleteCategory);


export default categoryRouter;
