const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');
const logger = require('../utils/logger');

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  family: 4,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  if (!MONGODB_URI) {
    logger.warn('MONGODB_URI is not set. Skipping database connection.');
    return null;
  }

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  let retries = 3;
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(MONGODB_URI, options);
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries -= 1;
      logger.error(`MongoDB connection failed. Retries left: ${retries}. Error: ${error.message}`);
      if (retries > 0) {
        await sleep(5000);
      }
    }
  }

  // Don't leave the API running without a database — keep trying in the background.
  logger.warn('MongoDB unavailable at startup. Will keep retrying in the background.');
  setInterval(async () => {
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(MONGODB_URI, options);
        logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
      } catch (error) {
        logger.error(`MongoDB background reconnect failed: ${error.message}`);
      }
    }
  }, 10000);

  return null;
};

module.exports = connectDB;
