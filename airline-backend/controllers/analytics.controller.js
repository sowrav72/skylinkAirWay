const prisma = require("../prisma/client");

/**
 * GET /api/analytics
 * Admin only. Returns key stats for the dashboard.
 */
const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPassengers,
      totalStaff,
      totalFlights,
      totalBookings,
      flightsByStatus,
      recentBookings,
      revenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "passenger" } }),
      prisma.user.count({ where: { role: "staff" } }),
      prisma.flight.count(),
      prisma.booking.count(),
      prisma.flight.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          flight: { select: { origin: true, destination: true, price: true } },
        },
      }),
      prisma.booking.findMany({
        include: { flight: { select: { price: true } } },
      }),
    ]);

    const totalRevenue = revenue.reduce(
      (sum, b) => sum + parseFloat(b.flight.price),
      0
    );

    res.json({
      users: {
        total: totalUsers,
        passengers: totalPassengers,
        staff: totalStaff,
      },
      flights: {
        total: totalFlights,
        byStatus: flightsByStatus.reduce((acc, s) => {
          acc[s.status] = s._count.status;
          return acc;
        }, {}),
      },
      bookings: {
        total: totalBookings,
      },
      revenue: {
        total: parseFloat(totalRevenue.toFixed(2)),
      },
      recentBookings,
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
};

module.exports = { getAnalytics };