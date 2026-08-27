const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, title, comment } = req.body;

  // Verify order exists, belongs to user, and is delivered
  const order = await Order.findOne({
    _id: orderId,
    user: req.user.id,
    status: 'delivered'
  });

  if (!order) throw new ApiError(403, 'You can only review products from delivered orders');

  // Verify product was in this order
  const orderItem = order.items.find(item => item.product.toString() === productId);
  if (!orderItem) throw new ApiError(400, 'Product not found in this order');

  // Check if already reviewed
  const existingReview = await Review.findOne({ user: req.user.id, product: productId, order: orderId });
  if (existingReview) throw new ApiError(400, 'You have already reviewed this product');

  const review = await Review.create({
    user: req.user.id,
    product: productId,
    order: orderId,
    rating,
    title,
    comment,
    isVerified: true
  });

  // Update product ratings
  const reviews = await Review.find({ product: productId });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await Product.findByIdAndUpdate(productId, {
    'ratings.average': Math.round(avgRating * 10) / 10,
    'ratings.count': reviews.length
  });

  // Mark order as reviewed
  order.isReviewed = true;
  await order.save();

  res.status(201).json({ success: true, data: review });
});

const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reviews });
});

module.exports = { createReview, getProductReviews };
