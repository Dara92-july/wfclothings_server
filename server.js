const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { validateEnv, PORT, NODE_ENV, CORS_ORIGINS } = require('./config/env');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Validate environment variables
validateEnv();

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false
}));

// CORS
const devLocalhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const isOriginAllowed = (origin) => {
  if (CORS_ORIGINS.includes(origin)) return true;
  if (NODE_ENV === 'development' && devLocalhostPattern.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, servers, etc.) that send no Origin header
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Raw body for Paystack webhooks (must run BEFORE express.json for webhook route)
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Attach raw body to req for webhook handler
app.use('/api/v1/payments/webhook', (req, res, next) => {
  req.rawBody = req.body;
  try {
    req.body = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    req.body = {};
  }
  next();
});

// Body parser - JSON
app.use(express.json({ limit: '10kb' }));

// Body parser - URL encoded
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Compression
app.use(compression());

// Rate limiting
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/reviews', require('./routes/reviews'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/upload', require('./routes/upload'));
app.use('/api/v1/analytics', require('./routes/analytics'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), environment: NODE_ENV });
});

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
