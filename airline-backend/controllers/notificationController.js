const prisma = require('../middleware/prismaClient')

// GET /api/notifications — paginated
async function getNotifications(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query
    const take = Math.min(100, parseInt(limit) || 30)
    const skip = (Math.max(1, parseInt(page)) - 1) * take

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
    ])

    res.json({ notifications, total, page: parseInt(page), pages: Math.ceil(total / take) })
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
}

// PUT /api/notifications/:id/read
async function markAsRead(req, res) {
  try {
    const id    = Number(req.params.id)
    const notif = await prisma.notification.findUnique({ where: { id } })

    if (!notif)                          return res.status(404).json({ error: 'Notification not found' })
    if (notif.userId !== req.user.id)    return res.status(403).json({ error: 'Forbidden' })

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Failed to update notification' })
  }
}

// PUT /api/notifications/read-all — mark all as read for current user
async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true },
    })
    res.json({ message: 'All notifications marked as read' })
  } catch {
    res.status(500).json({ error: 'Failed to update notifications' })
  }
}

// DELETE /api/notifications/read — delete all read notifications (cleanup)
async function deleteReadNotifications(req, res) {
  try {
    const { count } = await prisma.notification.deleteMany({
      where: { userId: req.user.id, isRead: true },
    })
    res.json({ message: `Deleted ${count} read notifications` })
  } catch {
    res.status(500).json({ error: 'Failed to delete notifications' })
  }
}

// Internal: called when flight status changes
async function notifyPassengersOnFlightUpdate(flightId, newStatus) {
  try {
    const flight = await prisma.flight.findUnique({ where: { id: flightId } })
    if (!flight) return

    const bookings = await prisma.booking.findMany({
      where:  { flightId, status: 'CONFIRMED' },
      select: { userId: true },
    })

    const messages = {
      DELAYED:   `✈ Your flight ${flight.flightNumber} (${flight.origin} → ${flight.destination}) has been delayed.`,
      CANCELLED: `✈ Your flight ${flight.flightNumber} (${flight.origin} → ${flight.destination}) has been cancelled. Please contact support.`,
      ON_TIME:   `✈ Your flight ${flight.flightNumber} (${flight.origin} → ${flight.destination}) is back on schedule.`,
      COMPLETED: `✈ Your flight ${flight.flightNumber} (${flight.origin} → ${flight.destination}) has completed. Thank you for flying SkyWings!`,
    }

    const message = messages[newStatus] || `Flight ${flight.flightNumber} status updated to ${newStatus}.`
    if (bookings.length > 0) {
      await prisma.notification.createMany({
        data: bookings.map(b => ({ userId: b.userId, message })),
      })
    }
  } catch (err) {
    console.error('notifyPassengers:', err)
  }
}

module.exports = { getNotifications, markAsRead, markAllRead, deleteReadNotifications, notifyPassengersOnFlightUpdate }
