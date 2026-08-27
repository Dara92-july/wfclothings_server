const Order = require('../models/Order');
const paystackService = require('../services/paystackService');
const inventoryService = require('../services/inventoryService');
const emailService = require('../services/emailService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { CLIENT_URL } = require('../config/env');

// Initialize payment
const initializePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');

  // Check authorization for registered users
  if (req.user && order.user && order.user.toString() !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  if (order.status !== 'pending') {
    throw new ApiError(400, 'Order already processed');
  }

  // Determine email for Paystack
  const email = req.user ? req.user.email : order.guestInfo?.email;
  if (!email) throw new ApiError(400, 'Customer email not available');

  // Generate unique reference
  const reference = `WF-${order.orderNumber}-${Date.now()}`;

  const paymentData = await paystackService.initializeTransaction({
    email,
    amount: order.pricing.total,
    reference,
    metadata: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: order.user?._id?.toString() || 'guest'
    },
    callback_url: `${CLIENT_URL}/payment/verify`
  });

  // Update order with payment reference
  order.payment.reference = reference;
  await order.save();

  res.json({
    success: true,
    data: {
      authorizationUrl: paymentData.authorization_url,
      reference: paymentData.reference,
      accessCode: paymentData.access_code
    }
  });
});

// Verify payment (callback)
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;

  if (!reference) throw new ApiError(400, 'Payment reference required');

  const verification = await paystackService.verifyTransaction(reference);

  const order = await Order.findOne({ 'payment.reference': reference }).populate('user');

  if (!order) throw new ApiError(404, 'Order not found for this reference');

  // Idempotency check
  if (order.payment.status === 'success') {
    return res.json({ success: true, data: { order, alreadyVerified: true } });
  }

  if (verification.status === 'success') {
    // Update order
    order.payment.status = 'success';
    order.payment.paidAt = new Date();
    order.payment.verifiedAt = new Date();
    await order.updateStatus('paid', 'Payment verified via callback');

    // Deduct stock
    await inventoryService.deductStock(
      order.items.map(item => ({ product: item.product, quantity: item.quantity }))
    );

    // Send confirmation email
    await emailService.sendOrderConfirmation(order);
  } else {
    order.payment.status = verification.status || 'failed';
    await order.save();
    await inventoryService.releaseStock(order.items);
  }

  res.json({ success: true, data: { order } });
});

// Webhook handler
const webhookHandler = asyncHandler(async (req, res) => {
  // Immediately acknowledge receipt
  res.status(200).send('OK');

  const signature = req.headers['x-paystack-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  // Verify signature
  if (!signature || !paystackService.verifyWebhookSignature(rawBody, signature)) {
    console.warn('Invalid webhook signature');
    return;
  }

  const event = req.body;

  if (event.event !== 'charge.success') {
    console.log(`Ignoring event: ${event.event}`);
    return;
  }

  const { reference, metadata } = event.data;

  const order = await Order.findOne({ 'payment.reference': reference });

  if (!order) {
    console.error(`Order not found for reference: ${reference}`);
    return;
  }

  // Idempotency check
  if (order.payment.status === 'success') {
    console.log(`Order ${order._id} already processed`);
    return;
  }

  // Process successful payment
  order.payment.status = 'success';
  order.payment.paidAt = new Date();
  order.payment.verifiedAt = new Date();
  await order.updateStatus('paid', 'Payment verified via webhook');

  await inventoryService.deductStock(
    order.items.map(item => ({ product: item.product, quantity: item.quantity }))
  );

  const populatedOrder = await Order.findById(order._id).populate('user');
  await emailService.sendOrderConfirmation(populatedOrder);

  console.log(`Webhook processed: Order ${order.orderNumber} paid`);
});

module.exports = {
  initializePayment, verifyPayment, webhookHandler
};
