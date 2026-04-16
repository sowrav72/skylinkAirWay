const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

/**
 * GET /api/users
 * Admin only. Returns all users (without passwords).
 */
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const where = role ? { role } : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

/**
 * GET /api/users/:id
 * Admin only.
 */
const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user." });
  }
};

/**
 * PUT /api/users/:id
 * Admin only. Can change role, name.
 */
const updateUser = async (req, res) => {
  try {
    const { name, role, password } = req.body;
    const userId = parseInt(req.params.id);

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ error: "User not found." });

    const data = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ message: "User updated.", user: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user." });
  }
};

/**
 * DELETE /api/users/:id
 * Admin only.
 */
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ error: "User not found." });

    // Clean up related records
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.booking.deleteMany({ where: { userId } });
    await prisma.staffFlight.deleteMany({ where: { staffId: userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: "User deleted." });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
};

/**
 * GET /api/users/me
 * Authenticated user's own profile.
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile." });
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, getProfile };