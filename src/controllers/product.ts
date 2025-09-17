import { Request, Response } from "express";
import { Collection } from "../models/collection";
import { Product } from "../models/product";
import { tryCatch } from "../utils/tryCatch";


const addProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { name, price, description, stock, codes, collectionIds } = req.body;
  const images = req.files?.images

  if (!images || images.length == 0) {
    return res.status(400).json({
      message: "image is required",
    });
  }

  let parsedCodes = JSON.parse(codes)

  if (!parsedCodes || parsedCodes.length == 0) {
    return res.status(400).json({
      message: "codes is required",
    });
  }

  if (parsedCodes.length < Number(stock)) {
    return res.status(400).json({
      message: `Enter ${Number(stock) - parsedCodes.length} more Codes`,
    });
  }


  const product = await Product.create({
    name,
    price,
    description,
    stock,
    image: images[0].path,
    codes: parsedCodes
  });

  if (!product) {
    return res.status(501).json({
      message: "something went wrong while creating Product",
    });
  }

  if (!collectionIds || collectionIds.length === 0) {
    return res.status(400).json({ message: "Collection IDs are required" });
  }


  const updateCollection = await Collection.updateMany(
    { _id: { $in: collectionIds } },
    { $addToSet: { products: product._id } } // prevents duplicates
  )

  if (updateCollection.matchedCount === 0) {
    return res.status(404).json({
      message: "No collections found with the given IDs",
    });
  }

  res.status(200).json({
    message: "Product created and added to collections successfully",
    success: true,
    product,
  });


});

const updateProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { name, price, description, stock, codes, collectionIds } = req.body;

  const collectionImage = req.files?.filter((f: any) => f.fieldname === "collectionImage")[0]?.path

  const product: any = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (description) product.description = description;
  if (stock) product.stock = stock;
  if (collectionImage) product.image = collectionImage;
  if (collectionIds && collectionIds.length > 0) {

    const updateCollection = await Collection.updateMany(
      { _id: { $in: collectionIds } },
      { $addToSet: { products: product._id } } // prevents duplicates
    )

    if (updateCollection.matchedCount === 0) {
      return res.status(404).json({
        message: "No collections found with the given IDs",
      });
    }

  }

  let parsedCodes;

  if (codes) {
    parsedCodes = JSON.parse(codes);
    if (!Array.isArray(parsedCodes) || parsedCodes.length === 0) {
      return res.status(400).json({ message: "At least one code is required" });
    }

    if (parsedCodes.length < Number(stock)) {
      return res.status(400).json({
        message: `Enter ${Number(stock) - parsedCodes.length} more Codes`,
      });
    }
    product.codes = parsedCodes;
  }


  await product.save();

  return res.status(200).json({
    message: "Product updated successfully!",
    success: true,
    product,
  });
});

const getAllProducts = tryCatch(async (req: any, res: Response): Promise<any> => {

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

  const [products, totalDocs] = await Promise.all([
    Product.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Product.countDocuments(searchQuery),
  ]);

  return res.status(200).json({
    message: "Products fetched successfully!",
    products,
    pagination: {
      totalDocs,
      currentPage: page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
    },
  });


});

const getProductById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  return res.status(200).json({
    message: "Product fetched successfully!",
    product,
  });


});

const deleteProduct = tryCatch(async (req: Request, res: Response): Promise<any> => {

  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.status(200).json({
    message: "Product deleted successfully!",
    success: true,
    product,
  })
});


export {
  addProduct, deleteProduct, getAllProducts,
  getProductById, updateProduct
};

