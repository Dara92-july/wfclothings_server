const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ parent: null, isActive: true })
    .populate({
      path: 'subcategories',
      match: { isActive: true },
      select: 'name slug image'
    });

  // Get product counts for each category
  const productCounts = await Product.aggregate([
    { $match: { category: { $in: categories.map(c => c._id) }, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(productCounts.map(pc => [pc._id.toString(), pc.count]));
  const categoriesWithCounts = categories.map(cat => ({
    ...cat.toObject(),
    productCount: countMap.get(cat._id.toString()) || 0
  }));

  res.json({ success: true, data: categoriesWithCounts });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: category });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  res.json({ success: true, message: 'Category deactivated' });
});

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
