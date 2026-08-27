const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { orderValidator } = require('../middleware/validate');

router.post('/', optionalAuth, orderValidator, orderController.createOrder);
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/:id', optionalAuth, orderController.getOrder);
router.get('/', protect, adminOnly, orderController.getAllOrders);
router.put('/:id/status', protect, adminOnly, orderController.updateStatus);

module.exports = router;
