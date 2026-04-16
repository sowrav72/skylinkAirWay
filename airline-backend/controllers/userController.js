const bcrypt = require("bcryptjs");
const prisma = require("../middleware/prismaClient");

// GET /api/users  — admin only
async function getAllUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// POST /api/users  — admin creates staff/admin accounts
async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
}

// DELETE /api/users/:id  — admin only
async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
}

// POST /api/users/assign-staff  — admin assigns staff to flight
async function assignStaffToFlight(req, res) {
  try {
    const { staffId, flightId } = req.body;
    if (!staffId || !flightId) {
      return res.status(400).json({ error: "staffId and flightId required" });
    }

    const staff = await prisma.user.findUnique({ where: { id: Number(staffId) } });
    if (!staff || staff.role !== "staff") {
      return res.status(400).json({ error: "User is not a staff member" });
    }

    const assignment = await prisma.staffFlight.upsert({
      where: { staffId_flightId: { staffId: Number(staffId), flightId: Number(flightId) } },
      create: { staffId: Number(staffId), flightId: Number(flightId) },
      update: {},
    });
    res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign staff" });
  }
}

module.exports = { getAllUsers, createUser, deleteUser, assignStaffToFlight };
