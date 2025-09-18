import { Request, Response } from "express";
import { Collection } from "../models/collection";
import { tryCatch } from "../utils/tryCatch";


const addCollection = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, description, slogan
  } = req.body;


  const collectionImage = req.files?.collectionImage[0].path

  if (!collectionImage) {
    return res.status(400).json({
      message: "collectionImage is required",
    });
  }


  const parseDescription = typeof description === "string" ? JSON.parse(description) : description;

  if (parseDescription && !Array.isArray(parseDescription)) {
    return res.status(400).json({
      message: "Description must be an array of objects with heading and text",
    });
  }

  const collection = await Collection.create({
    name,
    price: 0,
    description: parseDescription,
    slogan,
    image: collectionImage,
  })

  if (!collection) {
    return res.status(501).json({
      message: "something went wrong while creating Collection",
    });
  }

  res.status(200).json({
    message: "Collection created successfully!",
    success: true,
    collection,
  });

});

const updateCollection = tryCatch(async (req: any, res: Response): Promise<any> => {

  const { name, description, slogan } = req.body;
  const collectionImage = req.files?.collectionImage ? req.files?.collectionImage[0].path : null;

  const collection = await Collection.findById(req.params.id);

  if (!collection) {
    return res.status(404).json({ message: "Collection not found" });
  }

  let parsedDescription: any = undefined;

  if (description !== undefined) {
    parsedDescription =
      typeof description === "string" ? JSON.parse(description) : description;

    if (parsedDescription && !Array.isArray(parsedDescription)) {
      return res.status(400).json({
        message: "Description must be an array of objects with heading and text",
      });
    }

    collection.description = parsedDescription;
  }


  if (name) collection.name = name;
  if (slogan) collection.slogan = slogan;
  if (collectionImage) collection.image = collectionImage;

  await collection.save();

  return res.status(200).json({
    message: "Collection updated successfully!",
    success: true,
    collection,
  });

});

const getAllCollection = tryCatch(async (req: any, res: Response): Promise<any> => {

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword?.trim() || "";
  const skip = (page - 1) * limit;

  const searchQuery = keyword
    ? {
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    }
    : {};

  const [collections, totalDocs] = await Promise.all([
    Collection.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Collection.countDocuments(searchQuery),
  ]);

  return res.status(200).json({
    message: "Collections fetched successfully!",
    collections,
    pagination: {
      totalDocs,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });


});

const getCollectionById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const collection = await Collection.findById(req.params.id).populate("products");

  if (!collection) {
    return res.status(404).json({ message: "Collection not found" });
  }
  return res.status(200).json({
    message: "Collection fetched successfully!",
    collection,
  });


});

const deleteCollection = tryCatch(async (req: Request, res: Response): Promise<any> => {

  const collection = await Collection.findByIdAndDelete(req.params.id);

  if (!collection) {
    return res.status(404).json({ message: "Collection not found" });
  }

  return res.status(200).json({
    message: "Collection deleted successfully!",
    success: true,
    collection,
  });

});


export {
  addCollection, deleteCollection, getAllCollection,
  getCollectionById, updateCollection
};

