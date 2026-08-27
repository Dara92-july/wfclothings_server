const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    const decoded = verifyToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User belonging to this token no longer exists');
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new ApiError(401, 'User recently changed password. Please log in again');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired, please refresh');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    throw error;
  }
});

// Optional auth - doesn't throw if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

module.exports = { protect, optionalAuth };
