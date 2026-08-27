const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.get('/dashboard', protect, adminOnly, analyticsController.getDashboardStats);
router.get('/sales', protect, adminOnly, analyticsController.getSalesOverTime);
router.get('/low-stock', protect, adminOnly, analyticsController.getLowStock);

module.exports = router;
