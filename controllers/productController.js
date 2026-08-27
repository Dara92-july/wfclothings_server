const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildProductFilter, getPagination } = require('../utils/helpers');

// Get all products with filters
const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, sort = '-createdAt' } = req.query;
  const filter = buildProductFilter(req.query);

  // Resolve category param (id, name, or slug) to a category ObjectId
  if (req.query.category) {
    const categoryParam = req.query.category;
    if (mongoose.Types.ObjectId.isValid(categoryParam)) {
      filter.category = new mongoose.Types.ObjectId(categoryParam);
    } else {
      const cat = await Category.findOne({
        $or: [
          { name: categoryParam },
          { slug: categoryParam },
          { name: { $regex: categoryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
        ]
      }).select('_id');
      if (cat) filter.category = cat._id;
    }
  }

  const { skip, limit: limitNum } = getPagination(page, limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      page: Number(page),
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// Get single product
const getProduct = asyncHandler(async (req, res) => {
  const query = mongoose.Types.ObjectId.isValid(req.params.id)
    ? { $or: [{ slug: req.params.id }, { _id: req.params.id }] }
    : { slug: req.params.id };

  const product = await Product.findOne(query)
    .populate('category', 'name slug')
    .populate({
      path: 'reviews',
      populate: { path: 'user', select: 'name avatar' }
    });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.json({ success: true, data: product });
});

// Create product (Admin)
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  await product.populate('category');

  res.status(201).json({ success: true, data: product });
});

// Update product (Admin)
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('category');

  if (!product) throw new ApiError(404, 'Product not found');

  res.json({ success: true, data: product });
});

// Delete product (Admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) throw new ApiError(404, 'Product not found');

  res.json({ success: true, message: 'Product deactivated' });
});

// Get featured products
const getFeatured = asyncHandler(async (req, res) => {
  const products = await Product.find({ featured: true, isActive: true })
    .populate('category', 'name slug')
    .limit(8)
    .lean();

  res.json({ success: true, data: products });
});

// Search products
const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw new ApiError(400, 'Search query required');

  const products = await Product.find(
    { $text: { $search: q }, isActive: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .lean();

  res.json({ success: true, data: products });
});

module.exports = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getFeatured, searchProducts
};
