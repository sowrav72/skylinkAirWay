const prisma = require("../prisma/client");

/**
 * Internal helper: called by flight controller when status changes.
 * Creates a notification for every passenger booked on the flight.
 */
const notifyPassengers = async (flightId, message) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { flightId },
      select: { userId: true },
    });

    if (bookings.length === 0) return;

    const notifications = bookings.map((b) => ({
      userId: b.userId,
      message,
    }));

    await prisma.notification.createMany({ data: notifications });
  } catch (err) {
    console.error("notifyPassengers error:", err);
  }
};

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user.
 */
const getUserNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marks a notification as read.
 */
const markAsRead = async (req, res) => {
  try {
    const notifId = parseInt(req.params.id);

    const notif = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notif) return res.status(404).json({ error: "Notification not found." });
    if (notif.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    const updated = await prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true },
    });

    res.json({ message: "Notification marked as read.", notification: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification." });
  }
};

/**
 * PUT /api/notifications/read-all
 * Marks all unread notifications for the current user as read.
 */
const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notifications as read." });
  }
};

module.exports = { notifyPassengers, getUserNotifications, markAsRead, markAllAsRead };