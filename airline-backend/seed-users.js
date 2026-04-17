const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo users and staff assignments...')

  // Demo staff user
  const staffPassword = await bcrypt.hash('staff123', 10)
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@skylinkairway.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'staff@skylinkairway.com',
      password: staffPassword,
      role: 'staff'
    }
  })

  // Demo admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@skylinkairway.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@skylinkairway.com',
      password: adminPassword,
      role: 'admin'
    }
  })

  console.log('👤 Demo users created:')
  console.log(`   Staff: ${staffUser.email} (password: staff123)`)
  console.log(`   Admin: ${adminUser.email} (password: admin123)`)

  // Get some flights to assign to staff
  const flights = await prisma.flight.findMany({
    take: 5, // Assign first 5 flights to staff
    orderBy: { id: 'asc' }
  })

  if (flights.length > 0) {
    console.log('✈️ Assigning flights to staff...')

    for (const flight of flights) {
      await prisma.staffFlight.upsert({
        where: {
          staffId_flightId: {
            staffId: staffUser.id,
            flightId: flight.id
          }
        },
        update: {},
        create: {
          staffId: staffUser.id,
          flightId: flight.id
        }
      })
    }

    console.log(`✅ Assigned ${flights.length} flights to staff member ${staffUser.name}`)
  }

  console.log('🎉 Demo users and staff assignments completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })