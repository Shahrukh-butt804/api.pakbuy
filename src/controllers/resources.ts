import { Response } from "express";
import { Resource } from "../models/resouce";
import { tryCatch } from "../utils/tryCatch";

const addResource = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, content
  } = req.body;

  if (!name || !content) {
    return res.status(400).json({ message: "Please provide all required fields" });
  }

  const resource = await Resource.create({
    name, content
  });


  if (!resource) {
    return res.status(400).json({ message: "Something went wrong" });
  }

  res.status(200).json({
    message: "Resource added successfully!",
    success: true,
  });


});

const updateResource = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, content
  } = req.body;


  const updateFields: { name?: string, content?: string } = {}

  if (name) {
    updateFields.name = name
  }

  if (content) {
    updateFields.content = content
  }

  const resource = await Resource.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });

  if (!resource) {
    return res.status(400).json({ message: "Something went wrong while updating resource" });
  }

  res.status(200).json({
    message: "Resource updated successfully!",
    success: true,
  })
})

const getResources = tryCatch(async (req: any, res: Response): Promise<any> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword?.trim() || "";
  const skip = (page - 1) * limit;

  const searchQuery = keyword
    ? {
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [resources, totalDocs] = await Promise.all([
    Resource.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Resource.countDocuments(searchQuery),
  ]);

  res.status(200).json({
    message: "Resources fetched successfully!",
    resources,
    pagination: {
      totalDocs,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });

});

const getResourcesbyId = tryCatch(async (req: any, res: Response): Promise<any> => {

  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return res.status(400).json({ message: "resource not found" });
  }

  res.status(200).json({
    resource,
    message: "Resource fetched successfully!",
    success: true,
  });
});

const deleteResource = tryCatch(async (req: any, res: Response): Promise<any> => {

  const resource = await Resource.findByIdAndDelete(req.params.id);

  if (!resource) {
    return res.status(400).json({ message: "resource not found" });
  }

  res.status(200).json({
    message: "Resource deleted successfully!",
    success: true,
  });

});



export {
  addResource, deleteResource, getResources,
  getResourcesbyId, updateResource
};

