const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo flights...')

  // Demo flights data
  const demoFlights = [
    {
      origin: 'Dhaka',
      destination: 'Chittagong',
      departureTime: new Date('2026-04-18T08:00:00Z'), // Tomorrow 8:00 AM
      arrivalTime: new Date('2026-04-18T09:30:00Z'),   // Tomorrow 9:30 AM
      totalSeats: 150,
      price: 4500.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Dhaka',
      destination: 'Sylhet',
      departureTime: new Date('2026-04-18T10:00:00Z'), // Tomorrow 10:00 AM
      arrivalTime: new Date('2026-04-18T11:15:00Z'),   // Tomorrow 11:15 AM
      totalSeats: 120,
      price: 3800.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Dhaka',
      destination: 'Cox\'s Bazar',
      departureTime: new Date('2026-04-18T12:00:00Z'), // Tomorrow 12:00 PM
      arrivalTime: new Date('2026-04-18T13:45:00Z'),   // Tomorrow 1:45 PM
      totalSeats: 180,
      price: 5200.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Chittagong',
      destination: 'Dhaka',
      departureTime: new Date('2026-04-18T14:00:00Z'), // Tomorrow 2:00 PM
      arrivalTime: new Date('2026-04-18T15:30:00Z'),   // Tomorrow 3:30 PM
      totalSeats: 150,
      price: 4500.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Dhaka',
      destination: 'Rajshahi',
      departureTime: new Date('2026-04-18T16:00:00Z'), // Tomorrow 4:00 PM
      arrivalTime: new Date('2026-04-18T17:20:00Z'),   // Tomorrow 5:20 PM
      totalSeats: 100,
      price: 3200.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Dhaka',
      destination: 'Saidpur',
      departureTime: new Date('2026-04-18T18:00:00Z'), // Tomorrow 6:00 PM
      arrivalTime: new Date('2026-04-18T19:25:00Z'),   // Tomorrow 7:25 PM
      totalSeats: 90,
      price: 4100.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Sylhet',
      destination: 'Dhaka',
      departureTime: new Date('2026-04-18T20:00:00Z'), // Tomorrow 8:00 PM
      arrivalTime: new Date('2026-04-18T21:15:00Z'),   // Tomorrow 9:15 PM
      totalSeats: 120,
      price: 3800.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Dhaka',
      destination: 'Jessore',
      departureTime: new Date('2026-04-19T06:00:00Z'), // Day after tomorrow 6:00 AM
      arrivalTime: new Date('2026-04-19T07:15:00Z'),   // Day after tomorrow 7:15 AM
      totalSeats: 110,
      price: 2900.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Dhaka',
      destination: 'Barisal',
      departureTime: new Date('2026-04-19T08:00:00Z'), // Day after tomorrow 8:00 AM
      arrivalTime: new Date('2026-04-19T09:00:00Z'),   // Day after tomorrow 9:00 AM
      totalSeats: 85,
      price: 2600.00,
      status: 'ON_TIME'
    },
    {
      origin: 'Cox\'s Bazar',
      destination: 'Dhaka',
      departureTime: new Date('2026-04-19T10:00:00Z'), // Day after tomorrow 10:00 AM
      arrivalTime: new Date('2026-04-19T11:45:00Z'),   // Day after tomorrow 11:45 AM
      totalSeats: 180,
      price: 5200.00,
      status: 'ON_TIME'
    }
  ]

  // Create flights
  for (const flightData of demoFlights) {
    await prisma.flight.create({
      data: flightData
    })
  }

  console.log('✅ Demo flights seeded successfully!')
  console.log(`📊 Added ${demoFlights.length} flights to the database`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding flights:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })