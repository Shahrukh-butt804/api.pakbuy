const expressValidator = require("express-validator");
const { body } = expressValidator;

export const validateCollection = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Collection name is required"),
  body("title")
    .notEmpty()
    .withMessage("Title is required"),
  body("description")
    .notEmpty()
    .withMessage("Description is required"),
  body("slogan")
    .notEmpty()
    .withMessage("Slogan is required"),

];