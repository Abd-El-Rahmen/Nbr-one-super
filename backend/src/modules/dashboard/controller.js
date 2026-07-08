const DashboardService = require('./service');

const getStats = async (req, res, next) => {
  try {
    const data = await DashboardService.getStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
const getAnalytics = async (req, res, next) => {
  try {
    const data = await DashboardService.getAnalyticsData(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getStats, getAnalytics };
