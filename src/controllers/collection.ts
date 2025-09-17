import { Request, Response } from "express";
import { Collection } from "../models/collection";
import { tryCatch } from "../utils/tryCatch";


const addCollection = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, description,
  } = req.body;


  const collectionImage = req.files?.collectionImage[0].path

  if (!collectionImage) {
    return res.status(400).json({
      message: "collectionImage is required",
    });
  }

  // const product = await Product.findById(productsId)

  // if (!product) {
  //   return res.status(400).json({
  //     message: "product is required",
  //   });
  // }

  // let parsedCodes = JSON.parse(codes)

  // if (!parsedCodes || parsedCodes.length == 0) {
  //   return res.status(400).json({
  //     message: "codes is required",
  //   });
  // }

  // if (parsedCodes.length < Number(stock)) {
  //   return res.status(400).json({
  //     message: `Enter ${Number(stock) - parsedCodes.length} more Codes`,
  //   });
  // }

  const collection = await Collection.create({
    name,
    price: 0,
    description,
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

  const { name, description, } = req.body;
  const collectionImage = req.files?.collectionImage ? req.files?.collectionImage[0].path : null;

  const collection = await Collection.findById(req.params.id);

  if (!collection) {
    return res.status(404).json({ message: "Collection not found" });
  }

  if (name) collection.name = name;
  if (description) collection.description = description;
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

  const collection = await Collection.findById(req.params.id);

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

