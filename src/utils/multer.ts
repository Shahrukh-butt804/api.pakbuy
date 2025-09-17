import fs from 'fs';
import multer, { StorageEngine } from 'multer';
import path from 'path';

// Function to create a folder if it doesn't exist
const createFolderIfNotExists = (folderPath: string): void => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// General function to create multer storage
const createStorage = (uploadPath: string): StorageEngine => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadFolderPath = path.join('Uploads', uploadPath);
      createFolderIfNotExists(uploadFolderPath); // Ensure the folder exists
      cb(null, uploadFolderPath); // Set the upload path
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname); // Extract file extension
      const name = path.basename(file.originalname, extension);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`; // Generate a unique suffix
      const fileName = `${name}-${uniqueSuffix}${extension}`; // Create the file name
      cb(null, fileName); // Set the file name
    },
  });
};

// Create a file filter for allowed MIME types
const createFileFilter = (allowedMimeTypes: string[]) => {
  return (req: any, file: any, cb: Function) => {
    const { mimetype } = file;
    if (allowedMimeTypes.some((type) => mimetype.includes(type))) {
      cb(null, true); // Allow file
    } else {
      cb(new Error(`Only files of types: ${allowedMimeTypes.join(', ')} are allowed`), false); // Reject file
    }
  };
};

// Create the file size limit for multer
const createLimits = (maxSize: number) => {
  return {
    fileSize: maxSize * 1024 * 1024, // Convert MB to bytes
  };
};

// Error handler for multer
const errorHandler = (multerMiddleware: any) => {
  return (req: any, res: any, next: any) => {
    multerMiddleware(req, res, (err: any) => {
      if (err) {
        // Handle multer-specific errors
        return res.status(400).json({
          error: true,
          message: err.message,
        });
      }
      next(); // Continue to the next middleware
    });
  };
};

// Multer setups for different types of uploads

const uploadMulter = multer({
  storage: createStorage(''),
  fileFilter: createFileFilter(['image/', 'video/', 'application/pdf']),
  limits: createLimits(200),
}).any();

const licenseUpload = multer({
  storage: createStorage('license/'),
  fileFilter: createFileFilter(['image/']),
  limits: createLimits(10),
}).fields([
  { name: 'image', maxCount: 1 },
]);
const productUpload = multer({
  storage: createStorage('product/'),
  fileFilter: createFileFilter(['image/']),
  limits: createLimits(10),
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'collectionImage', maxCount: 10 },
]);

const collectionUpload = multer({
  storage: createStorage('collection/'),
  fileFilter: createFileFilter(['image/']),
  limits: createLimits(10),
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'collectionImage', maxCount: 10 },
]);

const updataProductUpload = multer({
  storage: createStorage("product/"),
  fileFilter: createFileFilter(["image/"]),
  limits: createLimits(10),
}).any();



const profileUpload = multer({
  storage: createStorage('profile/'),
  fileFilter: createFileFilter(['image/']),
  limits: createLimits(10),
}).fields([
  { name: 'image', maxCount: 1 },
]);


export default {
  licenseUpload: errorHandler(licenseUpload),
  productUpload: errorHandler(productUpload),
  collectionUpload: errorHandler(collectionUpload),
  profileUpload: errorHandler(profileUpload),
  updataProductUpload: errorHandler(updataProductUpload),
};
