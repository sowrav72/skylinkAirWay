const express = require("express");
const { getAllUsers, createUser, deleteUser, assignStaffToFlight } = require("../controllers/userController");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, requireRole("admin"), getAllUsers);
router.post("/", verifyToken, requireRole("admin"), createUser);
router.delete("/:id", verifyToken, requireRole("admin"), deleteUser);
router.post("/assign-staff", verifyToken, requireRole("admin"), assignStaffToFlight);

module.exports = router;
