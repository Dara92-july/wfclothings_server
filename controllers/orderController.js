const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateOrderNumber, calculatePricing } = require('../utils/helpers');
const inventoryService = require('../services/inventoryService');
const emailService = require('../services/emailService');

// Create order
const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, guestInfo } = req.body;

  // Validate stock availability
  const stockCheck = await inventoryService.checkAvailability(items);
  if (!stockCheck.available) {
    throw new ApiError(400, `Stock issues: ${stockCheck.issues.join(', ')}`);
  }

  // Get product details for pricing
  const productIds = items.map(i => i.product);
  const products = await Product.find({ _id: { $in: productIds } });

  const enrichedItems = items.map(item => {
    const product = products.find(p => p._id.toString() === item.product);
    if (!product) throw new ApiError(400, 'Invalid product in cart');

    return {
      product: product._id,
      name: product.name,
      price: product.effectivePrice,
      quantity: item.quantity,
      size: item.size,
      image: product.images[0]?.url
    };
  });

  // Calculate pricing with bulk discounts
  const pricing = calculatePricing(enrichedItems);

  // Build order data
  const orderData = {
    orderNumber: generateOrderNumber(),
    items: enrichedItems.map(item => ({
      product: item.product,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      image: item.image
    })),
    deliveryAddress,
    pricing: {
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total
    },
    status: 'pending'
  };

  if (req.user) {
    orderData.user = req.user.id;
  } else {
    if (!guestInfo || !guestInfo.name || !guestInfo.email) {
      throw new ApiError(400, 'Guest name and email are required');
    }
    orderData.guestInfo = guestInfo;
  }

  // Create order
  const order = await Order.create(orderData);

  // Reserve stock
  await inventoryService.reserveStock(items);

  res.status(201).json({
    success: true,
    data: order
  });
});

// Get user orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images slug');

  res.json({ success: true, data: orders });
});

// Get single order
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product', 'name images');

  if (!order) throw new ApiError(404, 'Order not found');

  // Only check ownership if user is authenticated and order has a user
  if (req.user && order.user && order.user.toString() !== req.user.id) {
    throw new ApiError(403, 'Not authorized');
  }

  res.json({ success: true, data: order });
});

// Admin: Get all orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
  });
});

// Admin: Update order status
const updateStatus = asyncHandler(async (req, res) => {
  const { status, tracking, note } = req.body;
  const order = await Order.findById(req.params.id).populate('user');

  if (!order) throw new ApiError(404, 'Order not found');

  const validTransitions = {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new ApiError(400, `Cannot transition from ${order.status} to ${status}`);
  }

  await order.updateStatus(status, note);

  if (tracking) {
    order.tracking = { ...order.tracking, ...tracking };
    await order.save();
  }

  // Send email notification
  await emailService.sendOrderStatusUpdate(order);

  res.json({ success: true, data: order });
});

module.exports = {
  createOrder, getMyOrders, getOrder, getAllOrders, updateStatus
};
