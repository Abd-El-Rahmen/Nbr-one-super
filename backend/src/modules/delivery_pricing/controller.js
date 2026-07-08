const DeliveryPricingService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const data = await DeliveryPricingService.getAllPricing();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await DeliveryPricingService.updatePricing(req.params.tier_id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, update };
