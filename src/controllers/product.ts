import { Request, Response } from "express";
import { Package } from "../models/product";
import { tryCatch } from "../utils/tryCatch";



const addProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, description, products
  } = req.body;

  const images = req.files?.images

  if (!images || images.length == 0) {
    return res.status(400).json({
      message: "image is required",
    });
  }

  let items = JSON.parse(products)

  if (!items || items.length == 0) {
    return res.status(400).json({
      message: "product is required",
    });
  }

  items = items.map((item: any, index: any) => {
    return {
      name: item.name,
      price: item.price,
      description: item.description,
      image: images[index].path
    }
  })

  const product = await Package.create({
    name,
    price: 0,
    description,
    products: items
  });

  if (!product) {
    return res.status(501).json({
      message: "something went wrong while creating Package",
    });
  }

  res.status(200).json({
    message: "Package created successfully!",
    success: true,
    product,
  });
});

const updateProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { name, description, products } = req.body;
  const images = req.files?.images;

  const pkg: any = await Package.findById(req.params.id);

  if (!pkg) {
    return res.status(404).json({ message: "Package not found" });
  }

  if (name) pkg.name = name;
  if (description) pkg.description = description;

  if (products) {
    let parsedProducts;
    try {
      parsedProducts = JSON.parse(products);
    } catch (err) {
      return res.status(400).json({ message: "Invalid products JSON" });
    }

    if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
      return res.status(400).json({ message: "At least one product is required" });
    }

    // Handle images (optional)
    const uploadedImages = images || [];

    // Re-map product list
    const updatedProducts = parsedProducts.map((item: any, index: number) => {
      return {
        name: item.name,
        price: item.price,
        description: item.description,
        image: uploadedImages[index]?.path || pkg.products[index]?.image || "", // fallback to existing image
      };
    });

    pkg.products = updatedProducts;
  }

  await pkg.save();

  return res.status(200).json({
    message: "Product updated successfully!",
    success: true,
    pkg,
  });
});

const getAllProducts = tryCatch(async (req: any, res: Response): Promise<any> => {

  // const page = Number(req.query.page) || 1;
  // const limit = Number(req.query.limit) || 10;
  // const rawCategories = req.query.categories?.split(",") || [];
  // const categories = rawCategories.filter((cat: string) => cat.trim() !== "");
  // const keyword = req.query.keyword?.trim() || "";

  // const priceRange = req.query.priceRange?.split(",") || [];
  // const minPrice = Number(priceRange[0]);
  // const maxPrice = Number(priceRange[1]);

  // const skip = (page - 1) * limit;

  // const query: any = {};
  // if (categories.length > 0) {
  //   query.category = { $in: categories };
  // }

  // if (keyword) {
  //   query.$or = [
  //     { name: { $regex: keyword, $options: "i" } },
  //     { description: { $regex: keyword, $options: "i" } },
  //   ];
  // }

  // if (!isNaN(minPrice) && !isNaN(maxPrice)) {
  //   query.price = { $gte: minPrice, $lte: maxPrice }
  // }

  // if (req.query.xpro === "false") {
  //   query.xpro = false;
  // }

  // const [products, totalCount] = await Promise.all([
  //   Package.find(query).skip(skip).limit(limit),
  //   Package.countDocuments(query),
  // ]);


  const packages = await Package.find({});


  return res.status(200).json({
    message: "packages fetched successfully!",
    packages,
    // totalCount,
  });

});

const getProductById = tryCatch(async (req: any, res: Response): Promise<any> => {

  const pkg = await Package.findById(req.params.id);

  if (!pkg) {
    return res.status(404).json({ message: "package not found" });
  }
  return res.status(200).json({
    message: "package fetched successfully!",
    pkg,
  });


});

const deleteProduct = tryCatch(
  async (req: Request, res: Response): Promise<any> => {

    const pkg = await Package.findByIdAndDelete(req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    return res.status(200).json({
      message: "Product deleted successfully!",
      success: true,
      pkg,
    })
  });


export {
  addProduct, deleteProduct, getAllProducts,
  getProductById, updateProduct
};

