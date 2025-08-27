import { Router } from "express";
import { addResource, deleteResource, getResources, getResourcesbyId, updateResource } from "../controllers/resources";


const resourcesRouter = Router();

resourcesRouter.route("/add-resource").post(addResource);
resourcesRouter.route("/update-resource/:id").put(updateResource);
resourcesRouter.route("/get-all-resources").get(getResources);
resourcesRouter.route("/get-resource-by-id/:id").get(getResourcesbyId);
resourcesRouter.route("/delete-resource/:id").delete(deleteResource);


export default resourcesRouter;
