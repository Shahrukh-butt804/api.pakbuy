const expressValidator = require("express-validator");
const { body } = expressValidator;

export const validateOrder = [
  // Billing Address (required)
  body('billingAddress.firstName').notEmpty().withMessage('First name is required'),
  body('billingAddress.lastName').notEmpty().withMessage('Last name is required'),
  body('billingAddress.address').notEmpty().withMessage('Address is required'),
  body('billingAddress.country').notEmpty().withMessage('Country is required'),
  body('billingAddress.state').notEmpty().withMessage('State is required'),
  body('billingAddress.city').notEmpty().withMessage('City is required'),
  body('billingAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('billingAddress.email').notEmpty().withMessage('Email is required'),
  body('billingAddress.phone').notEmpty().withMessage('Phone Number is required'),

  // Shipping Address (optional object, but if provided, fields are required)
  body('shippingAddress.firstName')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping first name is required'),
  body('shippingAddress.lastName')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping last name is required'),
  body('shippingAddress.address')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping address is required'),
  body('shippingAddress.country')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping country is required'),
  body('shippingAddress.state')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping state is required'),
  body('shippingAddress.city')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping city is required'),
  body('shippingAddress.zipCode')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping zip code is required'),
  body('shippingAddress.phone')
    .optional({ nullable: true })
    .notEmpty().withMessage('Shipping phone is required'),

  // Card Details (required)
  body('token').notEmpty().withMessage('token is required'),


  // Products
  body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('products.*.collectionId').notEmpty().withMessage('Collection ID is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

  // Optional Fields
  body('orderNote').optional().isString(),

  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
];
