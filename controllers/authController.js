const User = require('../models/User');
const { generateTokens } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, 'User already exists with this email');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens({
    id: user._id,
    role: user.role
  });

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      accessToken
    }
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens({
    id: user._id,
    role: user.role
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      accessToken
    }
  });
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public (with refresh token)
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token');
  }

  const { verifyToken } = require('../utils/generateToken');
  const decoded = verifyToken(refreshToken, true);

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  const { accessToken } = generateTokens({
    id: user._id,
    role: user.role
  });

  res.json({
    success: true,
    data: { accessToken }
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get current user profile
// @route   GET /api/v1/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, addresses } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone, addresses },
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    data: user
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If an account exists, a reset email has been sent'
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await emailService.sendPasswordReset(user, resetUrl);
    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Email could not be sent');
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Token is invalid or has expired');
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful'
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword
};
