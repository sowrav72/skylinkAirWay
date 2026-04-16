const prisma = require("../middleware/prismaClient");

// GET /api/notifications  — authenticated user's notifications
async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

// PUT /api/notifications/:id/read
async function markAsRead(req, res) {
  try {
    const id = Number(req.params.id);
    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification" });
  }
}

// Internal helper — called by flightController when flight status changes
async function notifyPassengersOnFlightUpdate(flightId, newStatus) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { flightId, status: "CONFIRMED" },
      select: { userId: true },
    });

    const flight = await prisma.flight.findUnique({ where: { id: flightId } });

    const statusMessages = {
      DELAYED: `Your flight ${flight.origin} → ${flight.destination} has been delayed.`,
      CANCELLED: `Your flight ${flight.origin} → ${flight.destination} has been cancelled.`,
      ON_TIME: `Your flight ${flight.origin} → ${flight.destination} is back on time.`,
      COMPLETED: `Your flight ${flight.origin} → ${flight.destination} has been completed.`,
    };

    const message = statusMessages[newStatus] || `Flight status updated to ${newStatus}.`;

    const notifications = bookings.map((b) => ({
      userId: b.userId,
      message,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (err) {
    console.error("Failed to send notifications:", err);
  }
}

module.exports = { getNotifications, markAsRead, notifyPassengersOnFlightUpdate };
