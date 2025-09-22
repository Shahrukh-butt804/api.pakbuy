import { Router } from "express";
import { addResource, deleteResource, getResources, getResourcesbyId, updateResource } from "../controllers/resources";
import { isAdmin } from "../middlewares/isAdmin..middleware";


const resourcesRouter = Router();

resourcesRouter.route("/add-resource").post(isAdmin, addResource);
resourcesRouter.route("/update-resource/:id").put(isAdmin, updateResource);
resourcesRouter.route("/get-all-resources").get(getResources);
resourcesRouter.route("/get-resource-by-id/:id").get(getResourcesbyId);
resourcesRouter.route("/delete-resource/:id").delete(isAdmin, deleteResource);


export default resourcesRouter;
