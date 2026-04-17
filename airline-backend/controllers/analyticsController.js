const prisma = require('../middleware/prismaClient')

async function getAnalytics(req, res) {
  try {
    const [
      totalUsers, totalFlights, totalBookings,
      cancelledBookings, flightsByStatus, usersByRole,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.flight.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.flight.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.user.groupBy({  by: ['role'],   _count: { id: true } }),
      // Revenue: sum price of all confirmed bookings
      prisma.booking.findMany({
        where:   { status: 'CONFIRMED' },
        include: { flight: { select: { price: true } } },
      }),
    ])

    const totalRevenue = recentBookings.reduce((sum, b) => sum + Number(b.flight.price), 0)

    res.json({
      totalUsers,
      totalFlights,
      totalBookings,
      cancelledBookings,
      totalRevenue:    totalRevenue.toFixed(2),
      flightsByStatus: flightsByStatus.map(f => ({ status: f.status, count: f._count.id })),
      usersByRole:     usersByRole.map(u => ({ role: u.role, count: u._count.id })),
    })
  } catch (err) {
    console.error('analytics:', err)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}

module.exports = { getAnalytics }
