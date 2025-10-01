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

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be a number between 0 and 5"),

  body("review")
    .notEmpty()
    .withMessage("Review count is required")
    .isInt({ min: 0 })
    .withMessage("Review count must be a non-negative integer"),

  body("collectionIds")
    .notEmpty()
    .withMessage("Collection IDs are required"),

];
