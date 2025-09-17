const expressValidator = require("express-validator");
const { body } = expressValidator;

export const validateCollection = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Collection name is required"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required"),

];