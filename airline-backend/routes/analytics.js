const express = require("express");
const { getAnalytics } = require("../controllers/analyticsController");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, requireRole("admin"), getAnalytics);

module.exports = router;
