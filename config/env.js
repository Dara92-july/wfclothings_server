const path = require('path');

// Load .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'PAYSTACK_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Comma-separated list of allowed CORS origins (production domains).
// Defaults to CLIENT_URL when not set.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
  PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@wfclothings.net',
  FROM_NAME: process.env.FROM_NAME || 'WF Clothings',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGINS,
  validateEnv
};
