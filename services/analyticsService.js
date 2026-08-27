const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');

class AnalyticsService {
  /**
   * Get dashboard statistics
   * @param {Object} dateRange - { startDate, endDate }
   */
  async getDashboardStats(dateRange = {}) {
    const matchStage = {};
    if (dateRange.startDate && dateRange.endDate) {
      matchStage.createdAt = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      };
    }

    const [totalRevenue, totalOrders, totalCustomers, bestSellingProducts] = await Promise.all([
      // Total revenue
      Order.aggregate([
        { $match: { ...matchStage, 'payment.status': 'success' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),

      // Total orders
      Order.countDocuments({ ...matchStage }),

      // Total customers
      User.countDocuments({ role: 'customer' }),

      // Best selling products
      Order.aggregate([
        { $match: { ...matchStage, 'payment.status': 'success' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { name: '$product.name', image: { $arrayElemAt: ['$product.images.url', 0] }, totalSold: 1, revenue: 1 } }
      ])
    ]);

    // Order status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCounts = {};
    statusBreakdown.forEach(s => { statusCounts[s._id] = s.count; });

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      totalCustomers,
      bestSellingProducts,
      statusCounts,
      averageOrderValue: totalOrders > 0 ? (totalRevenue[0]?.total || 0) / totalOrders : 0
    };
  }

  /**
   * Get sales over time (for charts)
   * @param {String} period - 'daily', 'weekly', 'monthly'
   * @param {Number} limit - Number of periods
   */
  async getSalesOverTime(period = 'daily', limit = 30) {
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-W%U' : '%Y-%m';
    const limitNum = Number(limit);
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(Math.floor(limitNum), 365) : 30;

    const sales = await Order.aggregate([
      { $match: { 'payment.status': 'success' } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: safeLimit },
      { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } }
    ]);

    return sales.reverse();
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts() {
    const products = await Product.find({
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      isActive: true
    }).select('name sku stockQuantity images lowStockThreshold').sort({ stockQuantity: 1 });

    return products;
  }
}

module.exports = new AnalyticsService();
