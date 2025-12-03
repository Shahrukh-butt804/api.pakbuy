import { Request, Response } from "express";
import { Collection } from "../models/collection";
import { Product } from "../models/product";
import { tryCatch } from "../utils/tryCatch";
import { recalcPrice } from "../utils/recalculateProductPrice";


const addProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { name, price, description, stock, codes, collectionIds, review, rating, link, retailPrice } = req.body;
  const images = req.files?.image

  if (!images || images.length == 0) {
    return res.status(400).json({
      message: "image is required",
    });
  }

  let parsedCodes = codes ? JSON.parse(codes) : [];

  if (parsedCodes.length > 0 && parsedCodes.length < Number(stock)) {
    return res.status(400).json({
      message: `Enter ${Number(stock) - parsedCodes.length} more Codes`,
    });
  }

  let parsedCollectionIds;

  try {
    parsedCollectionIds = Array.isArray(collectionIds)
      ? collectionIds
      : JSON.parse(collectionIds);
  } catch (err) {
    return res.status(400).json({ message: "Invalid collectionIds format" });
  }


  const product = await Product.create({
    name,
    price,
    description,
    stock,
    image: images[0].path,
    codes: parsedCodes,
    review,
    rating,
    link: link || null,
    retailPrice: retailPrice || price,
  });

  if (!product) {
    return res.status(501).json({
      message: "something went wrong while creating Product",
    });
  }

  if (!parsedCollectionIds || parsedCollectionIds.length === 0) {
    return res.status(400).json({ message: "Collection IDs are required" });
  }


  const updateCollection = await Collection.updateMany(
    { _id: { $in: parsedCollectionIds } },
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
  const { name, price, description, stock, codes, collectionIds, review, rating, link, retailPrice } = req.body;
  const productImage = req.files?.image ? req.files.image[0].path : null;


  const product: any = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  let parsedCollectionIds: string[] | null = null;

  if (collectionIds) {
    if (Array.isArray(collectionIds)) {
      parsedCollectionIds = collectionIds;
    } else {
      try {
        parsedCollectionIds = JSON.parse(collectionIds);
      } catch (err) {
        return res.status(400).json({ message: "Invalid collectionIds format" });
      }
    }
  }

  const oldPrice = product.price;

  if (name) product.name = name;
  if (description) product.description = description;
  if (stock) product.stock = stock;
  if (productImage) product.image = productImage;
  if (price) product.price = price;
  if (review) product.review = review;
  if (rating) product.rating = rating;
  if (link) product.link = link;
  if (retailPrice) product.retailPrice = retailPrice;

  if (parsedCollectionIds && parsedCollectionIds.length > 0) {

    const updateCollection = await Collection.updateMany(
      { _id: { $in: parsedCollectionIds } },
      { $addToSet: { products: product._id } }
    )

    await Collection.updateMany(
      { _id: { $nin: parsedCollectionIds } },
      { $pull: { products: product._id } }
    );

    if (updateCollection.matchedCount === 0) {
      return res.status(404).json({
        message: "No collections found with the given IDs",
      });
    }

  } else {
    return res.status(400).json({ message: "atleast one Collection ID is required" });
  }

  let parsedCodes;

  if (codes) {
    parsedCodes = JSON.parse(codes) || [];
    if (parsedCodes.length > 0 && parsedCodes.length < Number(stock)) {
      return res.status(400).json({
        message: `Enter ${Number(stock) - parsedCodes.length} more Codes`,
      });
    }
    product.codes = parsedCodes;
  }


  await product.save();


  if (price && oldPrice !== price) {
    const collections = await Collection.find({ products: product._id });
    for (const col of collections) {
      await recalcPrice(col);
      await col.save();
    }
  }

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

  const product: any = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  // also fincd collections containing this product
  const collections = await Collection.find({ products: product._id });

  product.collections = collections;

  let productWithCollections = {
    ...product._doc,
    collections: collections
  }

  return res.status(200).json({
    message: "Product fetched successfully!",
    product: productWithCollections,

  });


});

const deleteProduct = tryCatch(async (req: Request, res: Response): Promise<any> => {

  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const affectedCollections = await Collection.find({ products: product._id });


  await Collection.updateMany(
    { products: product._id },
    { $pull: { products: product._id } }
  );

  // recalc price for each affected collection
  for (const col of affectedCollections) {
    // refetch the updated collection (products array after pull)
    const updated = await Collection.findById(col._id);
    if (!updated) continue;

    // recalc price
    await recalcPrice(updated as any);
    // persist the new price
    await Collection.updateOne(
      { _id: updated._id },
      { $set: { CollectionPrice: updated.CollectionPrice } }
    );
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

