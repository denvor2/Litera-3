import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'

const fastify = Fastify({
  logger: true,
})

const prisma = new PrismaClient()

// Register CORS
fastify.register(cors, {
  origin: true,
})

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

// Projects routes
fastify.get('/api/projects', async (request, reply) => {
  const projects = await prisma.project.findMany({
    include: {
      books: {
        include: {
          chapters: {
            include: {
              scenes: true,
            },
          },
        },
      },
    },
  })
  return projects
})

fastify.post('/api/projects', async (request, reply) => {
  const { title, ownerId } = request.body as { title: string; ownerId: string }

  try {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
    })

    if (!user) {
      // Create default user if not exists
      await prisma.user.create({
        data: {
          id: ownerId,
          email: `${ownerId}@litstudio.local`,
          name: 'Default User',
        },
      })
    }

    const project = await prisma.project.create({
      data: {
        title,
        ownerId,
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
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        books: {
          include: {
            chapters: {
              include: {
                scenes: true,
              },
            },
          },
        },
      },
    })
    return project
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to create project' })
  }
})

// Books routes
fastify.get('/api/books/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const books = await prisma.book.findMany({
    where: { projectId },
    include: {
      chapters: {
        include: {
          scenes: true,
        },
      },
    },
  })
  return books
})

fastify.post('/api/books', async (request, reply) => {
  const { projectId, title } = request.body as { projectId: string; title: string }
  const maxOrder = await prisma.book.findFirst({
    where: { projectId },
    orderBy: { order: 'desc' },
  })

  const book = await prisma.book.create({
    data: {
      projectId,
      title,
      order: (maxOrder?.order ?? 0) + 1,
    },
  })
  return book
})

// Chapters routes
fastify.post('/api/chapters', async (request, reply) => {
  const { bookId, title } = request.body as { bookId: string; title: string }
  const maxOrder = await prisma.chapter.findFirst({
    where: { bookId },
    orderBy: { order: 'desc' },
  })

  const chapter = await prisma.chapter.create({
    data: {
      bookId,
      title,
      order: (maxOrder?.order ?? 0) + 1,
    },
  })
  return chapter
})

// Scenes routes
fastify.get('/api/scenes/:chapterId', async (request, reply) => {
  const { chapterId } = request.params as { chapterId: string }
  const scenes = await prisma.scene.findMany({
    where: { chapterId },
    orderBy: { order: 'asc' },
  })
  return scenes
})

fastify.post('/api/scenes', async (request, reply) => {
  const { chapterId, title } = request.body as { chapterId: string; title: string }
  const maxOrder = await prisma.scene.findFirst({
    where: { chapterId },
    orderBy: { order: 'desc' },
  })

  const scene = await prisma.scene.create({
    data: {
      chapterId,
      title,
      status: 'DRAFT',
      order: (maxOrder?.order ?? 0) + 1,
      wordCount: 0,
    },
  })
  return scene
})

fastify.get('/api/scenes/detail/:sceneId', async (request, reply) => {
  const { sceneId } = request.params as { sceneId: string }
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: {
      entityLinks: {
        include: {
          codexEntry: true,
        },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
  return scene
})

fastify.put('/api/scenes/:sceneId', async (request, reply) => {
  const { sceneId } = request.params as { sceneId: string }
  const { title, status, povCharacterId, body, notes, wordCount } = request.body as {
    title?: string
    status?: string
    povCharacterId?: string | null
    body?: unknown
    notes?: string
    wordCount?: number
  }

  try {
    // Сохранить версию при изменении статуса
    const currentScene = await prisma.scene.findUnique({
      where: { id: sceneId },
    })

    if (currentScene && status && currentScene.status !== status) {
      // Сохранить версию при переходе статуса
      await prisma.version.create({
        data: {
          entityType: 'scene',
          entityId: sceneId,
          sceneId,
          snapshot: currentScene.body,
        },
      })
    }

    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...(title && { title }),
        ...(status && { status }),
        ...(povCharacterId !== undefined && { povCharacterId }),
        ...(body && { body }),
        ...(notes !== undefined && { notes }),
        ...(wordCount !== undefined && { wordCount }),
      },
    })

    return updatedScene
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update scene' })
  }
})

fastify.patch('/api/scenes/order', async (request, reply) => {
  const { updates } = request.body as { updates: Array<{ id: string; chapterId: string; order: number }> }

  try {
    const result = await Promise.all(
      updates.map(update =>
        prisma.scene.update({
          where: { id: update.id },
          data: {
            chapterId: update.chapterId,
            order: update.order,
          },
        })
      )
    )
    return result
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update scene order' })
  }
})

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server running on http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
