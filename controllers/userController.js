const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = { role: 'customer' };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter)
  ]);

  res.json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').populate('orders');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user });
});

module.exports = { getAllUsers, getUser };
