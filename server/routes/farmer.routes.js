const { Router } = require("express");

const {
  createFarmer,
  getFarmerByPhone,
  updateFarmer,
  getFarmerDashboard,
  getFarmerAlerts,
  askFarmer,
} = require("../controllers/farmer.controller");

const router = Router();

// API
router.post("/", createFarmer);
router.get("/:phone", getFarmerByPhone);
router.put("/:phone", updateFarmer);
router.get("/:phone/dashboard", getFarmerDashboard);
router.get("/:phone/alerts", getFarmerAlerts);
router.post("/:phone/ask", askFarmer);

module.exports = router;