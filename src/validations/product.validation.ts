const expressValidator = require("express-validator");
const { body } = expressValidator;

export const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a number greater than 0"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required"),

  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("codes")
    .optional(),

  body("collectionIds")
    .notEmpty()
    .withMessage("Collection IDs are required"),

];
