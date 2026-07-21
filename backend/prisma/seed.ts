import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Создать или обновить дефолтного пользователя
  const defaultUser = await prisma.user.upsert({
    where: { email: 'default@litstudio.local' },
    update: {},
    create: {
      email: 'default@litstudio.local',
      name: 'Default User',
    },
  })

  // Создать дефолтный проект
  const project = await prisma.project.upsert({
    where: { id: 'default-project' },
    update: {},
    create: {
      id: 'default-project',
      title: 'Моя рукопись',
      ownerId: defaultUser.id,
      books: {
        create: [
          {
            title: 'Первая книга',
            order: 1,
            chapters: {
              create: [
                {
                  title: 'Первая глава',
                  order: 1,
                  scenes: {
                    create: [
                      {
                        title: 'Сцена 1',
                        status: 'DRAFT',
                        order: 1,
                        body: {
                          type: 'doc',
                          content: [
                            {
                              type: 'paragraph',
                              content: [
                                {
                                  type: 'text',
                                  text: 'Начните писать свою историю...',
                                },
                              ],
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('Seed completed:', {
    user: defaultUser.id,
    project: project.id,
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
