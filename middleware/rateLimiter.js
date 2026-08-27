const rateLimit = require('express-rate-limit');
const { NODE_ENV } = require('../config/env');

const isDev = NODE_ENV === 'development';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  skip: (req) => isDev || req.path.includes('/payments/webhook'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 10,
  skip: (req) => isDev,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after an hour'
  },
  skipSuccessfulRequests: true
});

// Payment limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 200 : 20,
  skip: (req) => isDev || req.path.includes('/payments/webhook'),
  message: {
    success: false,
    error: 'Too many payment attempts, please try again later'
  }
});

module.exports = { apiLimiter, authLimiter, paymentLimiter };
