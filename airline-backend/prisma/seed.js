const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ──────────────────────────────────────────────────────────────────
  // IMPORTANT: Change these passwords immediately after first login!
  const adminPw    = await bcrypt.hash('Admin@SkyWings2025!', 12)
  const staffPw    = await bcrypt.hash('Staff@SkyWings2025!', 12)
  const passPw     = await bcrypt.hash('Pass@SkyWings2025!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skywings.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@skywings.com', password: adminPw, role: 'admin' },
  })

  const staff1 = await prisma.user.upsert({
    where: { email: 'sarah.jones@skywings.com' },
    update: {},
    create: { name: 'Sarah Jones', email: 'sarah.jones@skywings.com', password: staffPw, role: 'staff' },
  })

  const staff2 = await prisma.user.upsert({
    where: { email: 'mike.chen@skywings.com' },
    update: {},
    create: { name: 'Mike Chen', email: 'mike.chen@skywings.com', password: staffPw, role: 'staff' },
  })

  const pass1 = await prisma.user.upsert({
    where: { email: 'alice.rahman@gmail.com' },
    update: {},
    create: { name: 'Alice Rahman', email: 'alice.rahman@gmail.com', password: passPw, role: 'passenger' },
  })

  const pass2 = await prisma.user.upsert({
    where: { email: 'bob.hasan@gmail.com' },
    update: {},
    create: { name: 'Bob Hasan', email: 'bob.hasan@gmail.com', password: passPw, role: 'passenger' },
  })

  const pass3 = await prisma.user.upsert({
    where: { email: 'carol.ahmed@gmail.com' },
    update: {},
    create: { name: 'Carol Ahmed', email: 'carol.ahmed@gmail.com', password: passPw, role: 'passenger' },
  })

  console.log('✅ Users created')

  // ── Flights ────────────────────────────────────────────────────────────────
  const now = new Date()
  const d = (daysOffset, hour = 8) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + daysOffset)
    dt.setHours(hour, 0, 0, 0)
    return dt
  }

  const flightsData = [
    { flightNumber: 'SW-0001', origin: 'Dhaka',     destination: 'Dubai',     departureTime: d(1,  6), arrivalTime: d(1, 11), totalSeats: 120, price: 450,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0002', origin: 'Dubai',     destination: 'London',    departureTime: d(1, 14), arrivalTime: d(1, 21), totalSeats: 180, price: 620,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0003', origin: 'Dhaka',     destination: 'Kuala Lumpur', departureTime: d(2, 8), arrivalTime: d(2, 14), totalSeats: 150, price: 380, status: 'ON_TIME'  },
    { flightNumber: 'SW-0004', origin: 'Dhaka',     destination: 'Singapore', departureTime: d(2, 22), arrivalTime: d(3,  4), totalSeats: 160, price: 410,  status: 'DELAYED'   },
    { flightNumber: 'SW-0005', origin: 'Singapore', destination: 'Tokyo',     departureTime: d(3,  9), arrivalTime: d(3, 16), totalSeats: 200, price: 530,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0006', origin: 'London',    destination: 'New York',  departureTime: d(3, 11), arrivalTime: d(3, 19), totalSeats: 250, price: 780,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0007', origin: 'Dhaka',     destination: 'Riyadh',    departureTime: d(4,  5), arrivalTime: d(4,  9), totalSeats: 140, price: 340,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0008', origin: 'Dubai',     destination: 'Paris',     departureTime: d(4, 13), arrivalTime: d(4, 19), totalSeats: 190, price: 590,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0009', origin: 'Dhaka',     destination: 'Kolkata',   departureTime: d(5,  7), arrivalTime: d(5,  8), totalSeats: 80,  price: 120,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0010', origin: 'Dhaka',     destination: 'Bangkok',   departureTime: d(5, 15), arrivalTime: d(5, 20), totalSeats: 130, price: 290,  status: 'CANCELLED' },
    { flightNumber: 'SW-0011', origin: 'Tokyo',     destination: 'Sydney',    departureTime: d(6, 10), arrivalTime: d(6, 19), totalSeats: 220, price: 860,  status: 'ON_TIME'   },
    { flightNumber: 'SW-0012', origin: 'Dhaka',     destination: 'Istanbul',  departureTime: d(7,  3), arrivalTime: d(7,  9), totalSeats: 170, price: 510,  status: 'ON_TIME'   },
    // Past flights for analytics
    { flightNumber: 'SW-0013', origin: 'Dubai',     destination: 'Dhaka',     departureTime: d(-3, 8), arrivalTime: d(-3, 13), totalSeats: 120, price: 450, status: 'COMPLETED' },
    { flightNumber: 'SW-0014', origin: 'London',    destination: 'Dhaka',     departureTime: d(-5, 6), arrivalTime: d(-5, 18), totalSeats: 180, price: 620, status: 'COMPLETED' },
    { flightNumber: 'SW-0015', origin: 'Singapore', destination: 'Dhaka',     departureTime: d(-7, 9), arrivalTime: d(-7, 15), totalSeats: 160, price: 410, status: 'COMPLETED' },
  ]

  const flights = []
  for (const f of flightsData) {
    const fl = await prisma.flight.upsert({
      where: { flightNumber: f.flightNumber },
      update: {},
      create: f,
    })
    flights.push(fl)
  }
  console.log(`✅ ${flights.length} flights created`)

  // ── Staff assignments ──────────────────────────────────────────────────────
  const assignments = [
    { staffId: staff1.id, flightId: flights[0].id },
    { staffId: staff1.id, flightId: flights[1].id },
    { staffId: staff1.id, flightId: flights[2].id },
    { staffId: staff2.id, flightId: flights[3].id },
    { staffId: staff2.id, flightId: flights[4].id },
    { staffId: staff2.id, flightId: flights[5].id },
  ]
  for (const a of assignments) {
    await prisma.staffFlight.upsert({
      where: { staffId_flightId: { staffId: a.staffId, flightId: a.flightId } },
      update: {},
      create: a,
    })
  }
  console.log('✅ Staff assignments created')

  // ── Sample bookings ────────────────────────────────────────────────────────
  const bookingsData = [
    { userId: pass1.id, flightId: flights[0].id, seatNo: 'A1', status: 'CONFIRMED' },
    { userId: pass1.id, flightId: flights[1].id, seatNo: 'B3', status: 'CONFIRMED' },
    { userId: pass2.id, flightId: flights[0].id, seatNo: 'A2', status: 'CONFIRMED' },
    { userId: pass2.id, flightId: flights[2].id, seatNo: 'C5', status: 'CANCELLED' },
    { userId: pass3.id, flightId: flights[4].id, seatNo: 'D7', status: 'CONFIRMED' },
    { userId: pass1.id, flightId: flights[12].id, seatNo: 'A1', status: 'CONFIRMED' },
    { userId: pass2.id, flightId: flights[13].id, seatNo: 'B2', status: 'CONFIRMED' },
    { userId: pass3.id, flightId: flights[14].id, seatNo: 'C3', status: 'CONFIRMED' },
  ]

  for (const b of bookingsData) {
    const exists = await prisma.booking.findUnique({
      where: { flightId_seatNo: { flightId: b.flightId, seatNo: b.seatNo } },
    })
    if (!exists) await prisma.booking.create({ data: b })
  }
  console.log('✅ Sample bookings created')

  // ── Notifications ──────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: pass1.id, message: 'Your flight SW-0001 (Dhaka → Dubai) departs tomorrow at 06:00. Have a safe journey!', isRead: false },
      { userId: pass1.id, message: 'Booking confirmed for SW-0002 (Dubai → London). Seat B3.', isRead: true },
      { userId: pass2.id, message: 'Flight SW-0004 (Dhaka → Singapore) has been delayed. New departure TBD.', isRead: false },
      { userId: pass3.id, message: 'Your booking SW-0005 (Singapore → Tokyo) is confirmed. Seat D7.', isRead: false },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Notifications created')

  console.log('\n🎉 Seed complete!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TEST CREDENTIALS (change after first login!)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('ADMIN   : admin@skywings.com      / Admin@SkyWings2025!')
  console.log('STAFF 1 : sarah.jones@skywings.com / Staff@SkyWings2025!')
  console.log('STAFF 2 : mike.chen@skywings.com  / Staff@SkyWings2025!')
  console.log('PASS 1  : alice.rahman@gmail.com  / Pass@SkyWings2025!')
  console.log('PASS 2  : bob.hasan@gmail.com     / Pass@SkyWings2025!')
  console.log('PASS 3  : carol.ahmed@gmail.com   / Pass@SkyWings2025!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
