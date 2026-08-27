const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await analyticsService.getDashboardStats({ startDate, endDate });
  res.json({ success: true, data: stats });
});

const getSalesOverTime = asyncHandler(async (req, res) => {
  const { period, limit } = req.query;
  const limitNum = Number(limit);
  const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : undefined;
  const data = await analyticsService.getSalesOverTime(period, safeLimit);
  res.json({ success: true, data });
});

const getLowStock = asyncHandler(async (req, res) => {
  const products = await analyticsService.getLowStockAlerts();
  res.json({ success: true, data: products });
});

module.exports = { getDashboardStats, getSalesOverTime, getLowStock };
