const expressValidator = require("express-validator");
const { body } = expressValidator;

export const couponValidation = [
  body("code")
    .notEmpty().withMessage("Coupon code is required")
    .isString().withMessage("Coupon code must be a string")
    .trim()
    .toUpperCase(), // optional: store codes in uppercase

  body("value")
    .notEmpty().withMessage("Coupon value is required")
    .isNumeric().withMessage("Coupon value must be a number")
    .custom((val: any) => val > 0).withMessage("Coupon value must be greater than 0"),

  body("type")
    .notEmpty().withMessage("Coupon type is required")
    .isIn(["amount", "percentage"]).withMessage("Type must be either 'amount' or 'percentage'"),

  body("expiryDate")
    .notEmpty().withMessage("Expiry date is required")
    .isISO8601().withMessage("Expiry date must be a valid date")
    .custom((date: any) => {
      if (new Date(date) < new Date()) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),

  body("limit")
    .notEmpty().withMessage("Usage limit is required")
    .isInt({ min: 1 }).withMessage("Limit must be at least 1"),

  body("perUserLimit")
    .optional()
    .isInt({ min: 1 }).withMessage("Per user limit must be at least 1"),

  body("description")
    .optional()
    .isString().withMessage("Description must be a string"),

  body("isActive")
    .optional()
    .isBoolean().withMessage("isActive must be a boolean"),
];
