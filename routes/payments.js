const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { optionalAuth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.post('/initialize', optionalAuth, paymentLimiter, paymentController.initializePayment);
router.get('/verify', paymentController.verifyPayment);
router.post('/webhook', paymentController.webhookHandler);

module.exports = router;
