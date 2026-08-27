const Product = require('../models/Product');
const logger = require('../utils/logger');

class InventoryService {
  /**
   * Reserve stock for pending order
   * @param {Array} items - Array of { product, quantity }
   */
  async reserveStock(items) {
    const reservations = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      if (!product.isInStock(item.quantity)) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.availableStock}, Requested: ${item.quantity}`);
      }

      await product.reserveStock(item.quantity);
      reservations.push({ product: product._id, quantity: item.quantity });
      logger.info(`Stock reserved: ${product.name} x ${item.quantity}`);
    }

    return reservations;
  }

  /**
   * Release reserved stock (when order is cancelled or payment fails)
   * @param {Array} items 
   */
  async releaseStock(items) {
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.releaseStock(item.quantity);
        logger.info(`Stock released: ${product.name} x ${item.quantity}`);
      }
    }
  }

  /**
   * Deduct stock after successful payment
   * @param {Array} items 
   */
  async deductStock(items) {
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.deductStock(item.quantity);
        logger.info(`Stock deducted: ${product.name} x ${item.quantity}`);
      }
    }
  }

  /**
   * Check stock availability for all items
   * @param {Array} items 
   * @returns {Object} - { available: Boolean, issues: Array }
   */
  async checkAvailability(items) {
    const issues = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        issues.push(`Product not found: ${item.product}`);
        continue;
      }

      if (!product.isActive) {
        issues.push(`${product.name} is no longer available`);
      } else if (!product.isInStock(item.quantity)) {
        issues.push(`${product.name}: Only ${product.availableStock} left in stock`);
      }
    }

    return {
      available: issues.length === 0,
      issues
    };
  }
}

module.exports = new InventoryService();
