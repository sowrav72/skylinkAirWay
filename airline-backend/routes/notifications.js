const express = require("express");
const { getNotifications, markAsRead } = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, getNotifications);
router.put("/:id/read", verifyToken, markAsRead);

module.exports = router;
