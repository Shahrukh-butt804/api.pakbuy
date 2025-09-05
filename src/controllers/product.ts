import { Request, Response } from "express";
import { Package } from "../models/product";
import { tryCatch } from "../utils/tryCatch";



const addProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const {
    name, description, products, stock, discountPrice
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
    stock,
    discountPrice,
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

// const updateProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
//   const { name, description, products, discountPrice } = req.body;
//   const images = req.files?.images;

//   const pkg: any = await Package.findById(req.params.id);

//   if (!pkg) {
//     return res.status(404).json({ message: "Package not found" });
//   }

//   if (name) pkg.name = name;
//   if (description) pkg.description = description;
//   if (discountPrice) pkg.discountPrice = discountPrice;

//   if (products) {
//     let parsedProducts;
//     try {
//       parsedProducts = JSON.parse(products);
//     } catch (err) {
//       return res.status(400).json({ message: "Invalid products JSON" });
//     }

//     if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
//       return res.status(400).json({ message: "At least one product is required" });
//     }

//     // Handle images (optional)
//     const uploadedImages = images || [];

//     // Re-map product list
//     const updatedProducts = parsedProducts.map((item: any, index: number) => {
//       return {
//         name: item.name,
//         price: item.price,
//         description: item.description,
//         image: uploadedImages[index]?.path || pkg.products[index]?.image || "", // fallback to existing image
//       };
//     });

//     pkg.products = updatedProducts;
//   }

//   await pkg.save();

//   return res.status(200).json({
//     message: "Product updated successfully!",
//     success: true,
//     pkg,
//   });
// });


const updateProduct = tryCatch(async (req: any, res: Response): Promise<any> => {
  const { name, description, stock, products, discountPrice } = req.body;
  const files = req.files as Express.Multer.File[];

  const pkg: any = await Package.findById(req.params.id);
  if (!pkg) {
    return res.status(404).json({ message: "Package not found" });
  }

  if (name) pkg.name = name;
  if (description) pkg.description = description;
  if (discountPrice) pkg.discountPrice = discountPrice;
  if (stock) pkg.stock = stock;

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

    const updatedProducts = parsedProducts.map((item: any, index: number) => {
      const fileKey = `products[${index}][image]`;
      const uploadedFile = files.find((f) => f.fieldname === fileKey);

      return {
        name: item.name,
        price: item.price,
        description: item.description,
        image: uploadedFile
          ? uploadedFile.path
          : pkg.products[index]?.image || "",
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

  const [packages, totalDocs] = await Promise.all([
    Package.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Package.countDocuments(searchQuery),
  ]);

  return res.status(200).json({
    message: "Users  fetched successfully!",
    packages,
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

