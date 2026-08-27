const { body, param, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg).join(', ');
    throw new ApiError(400, messages);
  }
  next();
};

// Auth validators
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name too long'),
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim().isMobilePhone().withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

const loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Product validators
const productValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 100 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stockQuantity').isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  handleValidationErrors
];

// Order validators
const orderValidator = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.product').isMongoId().withMessage('Valid product ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryAddress').isObject().withMessage('Delivery address is required'),
  body('deliveryAddress.street').trim().notEmpty().withMessage('Street is required'),
  body('deliveryAddress.city').trim().notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').trim().notEmpty().withMessage('State is required'),
  handleValidationErrors
];

// Review validator
const reviewValidator = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required').isLength({ max: 2000 }),
  handleValidationErrors
];

module.exports = {
  registerValidator,
  loginValidator,
  productValidator,
  orderValidator,
  reviewValidator,
  handleValidationErrors
};
