import multer, { StorageEngine } from "multer";
import { uploadBufferToCloudinary } from "./cloudinary"; // adjust path

// Memory storage instead of disk storage
const storage: StorageEngine = multer.memoryStorage();

// Create a file filter for allowed MIME types
const createFileFilter = (allowedMimeTypes: string[]) => {
  return (req: any, file: any, cb: Function) => {
    const { mimetype } = file;
    if (allowedMimeTypes.some((type) => mimetype.includes(type))) {
      cb(null, true);
    } else {
      cb(
        new Error(`Only files of types: ${allowedMimeTypes.join(", ")} are allowed`),
        false
      );
    }
  };
};

const createLimits = (maxSize: number) => {
  return {
    fileSize: maxSize * 1024 * 1024,
  };
};

// Error handler for multer
const errorHandler = (multerMiddleware: any) => {
  return (req: any, res: any, next: any) => {
    multerMiddleware(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          error: true,
          message: err.message,
        });
      }
      next();
    });
  };
};

// 🔑 This middleware uploads every file in req.files to Cloudinary
// and replaces file.path with the Cloudinary secure_url
const uploadToCloudinaryMiddleware = (folder: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const files = req.files;
      if (!files) return next();

      // req.files can be an array (when using .any()) or an object (when using .fields())
      const fileList: any[] = Array.isArray(files)
        ? files
        : Object.values(files).flat();

      await Promise.all(
        fileList.map(async (file: any) => {
          const result = await uploadBufferToCloudinary(file.buffer, folder);
          file.path = result.secure_url; // 👈 same shape your controllers expect
          file.cloudinaryId = result.public_id; // handy if you need to delete later
        })
      );

      next();
    } catch (error: any) {
      return res.status(500).json({
        error: true,
        message: error.message || "Cloudinary upload failed",
      });
    }
  };
};

// Multer setups for different types of uploads

const uploadMulter = multer({
  storage,
  fileFilter: createFileFilter(["image/", "video/", "application/pdf"]),
  limits: createLimits(200),
}).any();

const licenseUpload = multer({
  storage,
  fileFilter: createFileFilter(["image/"]),
  limits: createLimits(10),
}).fields([{ name: "image", maxCount: 1 }]);

const productUpload = multer({
  storage,
  fileFilter: createFileFilter(["image/"]),
  limits: createLimits(10),
}).fields([
  { name: "image", maxCount: 1 },
  { name: "collectionImage", maxCount: 10 },
]);

const collectionUpload = multer({
  storage,
  fileFilter: createFileFilter(["image/"]),
  limits: createLimits(10),
}).fields([
  { name: "image", maxCount: 1 },
  { name: "collectionImage", maxCount: 10 },
]);

const updataProductUpload = multer({
  storage,
  fileFilter: createFileFilter(["image/"]),
  limits: createLimits(10),
}).any();

const profileUpload = multer({
  storage,
  fileFilter: createFileFilter(["image/"]),
  limits: createLimits(10),
}).fields([{ name: "image", maxCount: 1 }]);

export default {
  licenseUpload: [
    errorHandler(licenseUpload),
    uploadToCloudinaryMiddleware("license"),
  ],
  productUpload: [
    errorHandler(productUpload),
    uploadToCloudinaryMiddleware("product"),
  ],
  collectionUpload: [
    errorHandler(collectionUpload),
    uploadToCloudinaryMiddleware("collection"),
  ],
  profileUpload: [
    errorHandler(profileUpload),
    uploadToCloudinaryMiddleware("profile"),
  ],
  updataProductUpload: [
    errorHandler(updataProductUpload),
    uploadToCloudinaryMiddleware("product"),
  ],
};