import { Router } from "express";
import { addCollection, deleteCollection, getAllCollection, getCollectionById, updateCollection } from "../controllers/collection";
import uploads from "../utils/multer";
import { validateCollection } from "../validations/collection.validation";
import { handleValidationErrors } from "../validations/user.validation";
import { isAdmin } from "../middlewares/isAdmin..middleware";

const collectionRouter = Router();

collectionRouter.route("/add-collection").post(isAdmin, uploads.collectionUpload,
  validateCollection, handleValidationErrors,
  addCollection);
collectionRouter.route("/update-collection/:id").put(isAdmin, uploads.collectionUpload, updateCollection);
collectionRouter.route("/get-all-collection").get(getAllCollection);
collectionRouter.route("/get-collection-by-id/:id").get(getCollectionById);
collectionRouter.route("/delete-collection/:id").delete(isAdmin, deleteCollection);

export default collectionRouter;
