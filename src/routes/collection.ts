import { Router } from "express";
import { addCollection, deleteCollection, getAllCollection, getCollectionById, updateCollection } from "../controllers/collection";
import uploads from "../utils/multer";
import { validateCollection } from "../validations/collection.validation";
import { handleValidationErrors } from "../validations/user.validation";

const collectionRouter = Router();

collectionRouter.route("/add-collection").post(uploads.productUpload,
  validateCollection, handleValidationErrors,
  addCollection);
collectionRouter.route("/update-collection/:id").put(uploads.updataProductUpload, updateCollection);
collectionRouter.route("/get-all-collection").get(getAllCollection);
collectionRouter.route("/get-collection-by-id/:id").get(getCollectionById);
collectionRouter.route("/delete-collection/:id").delete(deleteCollection);

export default collectionRouter;
