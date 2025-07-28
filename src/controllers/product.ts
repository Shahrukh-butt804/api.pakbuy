import { Request, Response } from "express";
import { Product } from "../models/product";
import { tryCatch } from "../utils/tryCatch";
import { Category } from "../models/category";

const addProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, price, description, stock, categoryId, xpro, discountPrice, weight, length, color
  } = req.body;


  let categories = JSON.parse(categoryId);

  const images = req.files?.image?.map((file: any) => file.path);

  const category = await Category.find({ _id: { $in: categories } });

  if (!category || category.length == 0) {
    return res.status(400).json({
      message: "category is required",
    });
  }

  if (!images || images.length == 0) {
    return res.status(400).json({
      message: "image is required",
    });
  }

  const product = await Product.create({
    name, price, description, stock,
    images: images,
    category: categories,
    xpro: xpro === "true" ? true : false,
    discountPrice,
    weight,
    length,
    color
  });

  if (!product) {
    return res.status(501).json({
      message: "something went wrong while creating user",
    });
  }

  res.status(200).json({
    message: " product created successfully!",
    success: true,
    product,
  });
});

const updateProduct = tryCatch(async (req: any, res: Response): Promise<any> => {

  const {
    name, price, description, stock, categoryId, xpro, discountPrice, weight, length, color, removedImages
  } = req.body;

  const images = req.files?.image?.map((file: any) => file.path);

  let categories = JSON.parse(categoryId);

  const category = await Category.find({ _id: { $in: categories } });

  if (!category || category.length == 0) {
    return res.status(400).json({
      message: "category is required",
    });
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name, price, description, stock, category: categories, xpro, discountPrice, weight, length, color
      },
    },
    {
      new: true,
    },
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (removedImages && removedImages.length > 0) {
    product.images = product.images.filter((image: any) => !removedImages.includes(image));
  }

  if (images) {
    product.images = [...product.images, ...images]
  }

  await product.save();


  return res.status(200).json({
    message: "Product updated successfully!",
    success: true,
    product,
  })

});

const getAllProducts = tryCatch(async (req: any, res: Response): Promise<any> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const rawCategories = req.query.categories?.split(",") || [];
  const categories = rawCategories.filter((cat: string) => cat.trim() !== "");
  const keyword = req.query.keyword?.trim() || "";

  const priceRange = req.query.priceRange?.split(",") || [];
  const minPrice = Number(priceRange[0]);
  const maxPrice = Number(priceRange[1]);

  const skip = (page - 1) * limit;

  const query: any = {};
  if (categories.length > 0) {
    query.category = { $in: categories };
  }

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  if (!isNaN(minPrice) && !isNaN(maxPrice)) {
    query.price = { $gte: minPrice, $lte: maxPrice }
  }

  if (req.query.xpro === "false") {
    query.xpro = false;
  }

  const [products, totalCount] = await Promise.all([
    Product.find(query).skip(skip).limit(limit).populate("category"),
    Product.countDocuments(query),
  ]);

  return res.status(200).json({
    message: "Products fetched successfully!",
    products,
    totalCount,
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

const deleteProduct = tryCatch(
  async (req: Request, res: Response): Promise<any> => {

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

const getRandomProducts = tryCatch(async (req: any, res: Response): Promise<any> => {
  const limit = parseInt(req.query.limit) || 5;

  const totalCount = await Product.countDocuments();

  if (totalCount === 0) {
    return res.status(200).json({ message: "No products found", products: [] });
  }

  const randomIndexes = new Set<number>();
  while (randomIndexes.size < Math.min(limit, totalCount)) {
    const randomIndex = Math.floor(Math.random() * totalCount);
    randomIndexes.add(randomIndex);
  }

  const randomProductsPromises = Array.from(randomIndexes).map((index) =>
    Product.findOne().skip(index)
  );

  const products = await Promise.all(randomProductsPromises);

  return res.status(200).json({
    message: "Random products fetched successfully!",
    products,
  });
});


export {
  addProduct, deleteProduct, getAllProducts,
  getProductById, updateProduct, getRandomProducts
};

