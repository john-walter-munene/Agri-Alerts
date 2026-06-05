const {
  createFarmerService,
  getFarmerByPhoneService,
  updateFarmerService,
  getFarmerDashboardService,
  getFarmerAlertsService,
} = require("../services/farmer.service");

const { askFarmerService } = require("../services/ask.service");
const { asyncHandler } = require("../lib/asyncHandler");
const { normalizePhone } = require("../lib/phone");
const {
  createFarmerSchema,
  updateFarmerSchema,
  askFarmerSchema,
} = require("../schemas/farmer.schema");

// create farmer
const createFarmer = asyncHandler(async (req, res) => {
  const parsed = createFarmerSchema.parse(req.body);
  const data = await createFarmerService({
    ...parsed,
    phone: normalizePhone(parsed.phone),
  });
  res.status(201).json({ success: true, data });
});

// get farmer by phone
const getFarmerByPhone = asyncHandler(async (req, res) => {
  const data = await getFarmerByPhoneService(normalizePhone(req.params.phone));
  res.json({ success: true, data });
});

// update farmer
const updateFarmer = asyncHandler(async (req, res) => {
  const parsed = updateFarmerSchema.parse(req.body);
  const data = await updateFarmerService(
    normalizePhone(req.params.phone),
    parsed
  );
  res.json({ success: true, data });
});

// get farmer dashboard
const getFarmerDashboard = asyncHandler(async (req, res) => {
  // ?force=true bypasses the forecast cache. Used by "Re-check conditions".
  const force = req.query.force === "true" || req.query.force === "1";
  const data = await getFarmerDashboardService(
    normalizePhone(req.params.phone),
    { force }
  );
  res.json({ success: true, data });
});

// get farmer alerts (persisted history feed)
const getFarmerAlerts = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const data = await getFarmerAlertsService(normalizePhone(req.params.phone), { limit });
  res.json({ success: true, data });
});

// ask farmer (AI + weather + alerts)
const askFarmer = asyncHandler(async (req, res) => {
  const parsed = askFarmerSchema.parse(req.body);
  const data = await askFarmerService(normalizePhone(req.params.phone), parsed);
  res.json({ success: true, data });
});

module.exports = {
  createFarmer,
  getFarmerByPhone,
  updateFarmer,
  getFarmerDashboard,
  getFarmerAlerts,
  askFarmer,
};