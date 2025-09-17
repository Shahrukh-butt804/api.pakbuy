import { Router } from "express";

import { addProduct, deleteProduct, getAllProducts, getProductById, updateProduct } from "../controllers/product";
import uploads from "../utils/multer";
import { validateProduct } from "../validations/product.validation";
import { handleValidationErrors } from "../validations/user.validation";

const productRouter = Router();

productRouter.route("/add-product").post(uploads.productUpload, validateProduct, handleValidationErrors, addProduct);
productRouter.route("/update-product/:id").put(uploads.productUpload, updateProduct);
productRouter.route("/get-all-products").get(getAllProducts);
productRouter.route("/get-product-by-id/:id").get(getProductById);
productRouter.route("/delete-product/:id").delete(deleteProduct);

export default productRouter;
