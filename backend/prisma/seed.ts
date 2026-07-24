import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create admin user if not exists
  const adminEmail = 'denvor2@gmail.com'
  const adminPassword = 'Denvor127'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Den',
        password: hashedPassword,
      },
    })
    console.log('✓ Admin user created:', admin.email)
  } else {
    console.log('✓ Admin user already exists:', existingAdmin.email)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
