const { paystack } = require('../config/paystack');
const logger = require('../utils/logger');

class PaystackService {
  /**
   * Initialize a transaction
   * @param {Object} params - { email, amount, reference, metadata, callback_url }
   * @returns {Object} - Paystack response data
   */
  async initializeTransaction(params) {
    try {
      const response = await paystack.post('/transaction/initialize', {
        email: params.email,
        amount: params.amount, // Amount in kobo
        reference: params.reference,
        metadata: params.metadata || {},
        callback_url: params.callback_url,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
      });

      if (response.data.status) {
        logger.info(`Transaction initialized: ${params.reference}`);
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      logger.error(`Paystack initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify a transaction
   * @param {String} reference - Transaction reference
   * @returns {Object} - Verification data
   */
  async verifyTransaction(reference) {
    try {
      const response = await paystack.get(`/transaction/verify/${reference}`);

      if (response.data.status) {
        logger.info(`Transaction verified: ${reference}, Status: ${response.data.data.status}`);
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      logger.error(`Paystack verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction details
   * @param {String} reference 
   * @returns {Object}
   */
  async getTransaction(reference) {
    try {
      const response = await paystack.get(`/transaction/${reference}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param {String} rawBody - Raw request body
   * @param {String} signature - x-paystack-signature header
   * @returns {Boolean}
   */
  verifyWebhookSignature(rawBody, signature) {
    const crypto = require('crypto');
    const { PAYSTACK_SECRET_KEY } = require('../config/env');

    // Defensive: return false for missing input
    if (!rawBody || !signature) return false;

    let hash;
    try {
      hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(rawBody)
        .digest('hex');
    } catch (error) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }
}

module.exports = new PaystackService();
