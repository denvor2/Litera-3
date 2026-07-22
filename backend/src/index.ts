import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { exportBookToDocx } from './services/docxExport'

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
      codexEntries: true,
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
    include: {
      chapters: {
        include: {
          scenes: true,
        },
      },
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

// Codex entries routes
fastify.get('/api/codex/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const entries = await prisma.codexEntry.findMany({
    where: { projectId },
  })
  return entries
})

fastify.get('/api/codex/:projectId/characters', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const entries = await prisma.codexEntry.findMany({
    where: { projectId, type: 'character' },
  })
  return entries
})

fastify.get('/api/codex/:projectId/locations', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const entries = await prisma.codexEntry.findMany({
    where: { projectId, type: 'location' },
  })
  return entries
})

fastify.post('/api/codex', async (request, reply) => {
  const { projectId, type, name, attributes } = request.body as {
    projectId: string
    type: string
    name: string
    attributes?: unknown
  }

  try {
    const attributesStr = typeof attributes === 'string' ? attributes : JSON.stringify(attributes || {})
    const entry = await prisma.codexEntry.create({
      data: {
        projectId,
        type,
        name,
        attributes: attributesStr,
      },
    })
    return entry
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to create codex entry' })
  }
})

fastify.put('/api/codex/:entryId', async (request, reply) => {
  const { entryId } = request.params as { entryId: string }
  const { name, attributes } = request.body as { name?: string; attributes?: unknown }

  try {
    const entry = await prisma.codexEntry.update({
      where: { id: entryId },
      data: {
        ...(name && { name }),
        ...(attributes && { attributes }),
      },
    })
    return entry
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update codex entry' })
  }
})

fastify.delete('/api/codex/:entryId', async (request, reply) => {
  const { entryId } = request.params as { entryId: string }

  try {
    await prisma.codexEntry.delete({
      where: { id: entryId },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete codex entry' })
  }
})

// Scene entity links
fastify.post('/api/scene-entity-links', async (request, reply) => {
  const { sceneId, codexEntryId } = request.body as { sceneId: string; codexEntryId: string }

  try {
    const link = await prisma.sceneEntityLink.create({
      data: {
        sceneId,
        codexEntryId,
      },
      include: {
        codexEntry: true,
      },
    })
    return link
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to create scene entity link' })
  }
})

fastify.delete('/api/scene-entity-links/:sceneId/:codexEntryId', async (request, reply) => {
  const { sceneId, codexEntryId } = request.params as { sceneId: string; codexEntryId: string }

  try {
    await prisma.sceneEntityLink.delete({
      where: {
        sceneId_codexEntryId: {
          sceneId,
          codexEntryId,
        },
      },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete scene entity link' })
  }
})

// Versions routes
fastify.get('/api/scenes/:sceneId/versions', async (request, reply) => {
  const { sceneId } = request.params as { sceneId: string }
  const versions = await prisma.version.findMany({
    where: { sceneId },
    orderBy: { createdAt: 'desc' },
  })
  return versions
})

fastify.post('/api/versions/restore', async (request, reply) => {
  const { versionId, sceneId } = request.body as { versionId: string; sceneId: string }

  try {
    // Get the version
    const version = await prisma.version.findUnique({
      where: { id: versionId },
    })

    if (!version) {
      reply.code(404).send({ error: 'Version not found' })
      return
    }

    // Update scene with version snapshot
    const currentScene = await prisma.scene.findUnique({
      where: { id: sceneId },
    })

    // Create a new version for current state before restoring
    if (currentScene) {
      await prisma.version.create({
        data: {
          entityType: 'scene',
          entityId: sceneId,
          sceneId,
          snapshot: currentScene.body,
        },
      })
    }

    // Restore scene
    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        body: version.snapshot,
      },
    })

    return updatedScene
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore version' })
  }
})

// Export routes
fastify.get('/api/books/:bookId/export', async (request, reply) => {
  const { bookId } = request.params as { bookId: string }

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      reply.code(404).send({ error: 'Book not found' })
      return
    }

    const docxBuffer = await exportBookToDocx(bookId)

    reply.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    reply.header('Content-Disposition', `attachment; filename="${book.title}.docx"`)
    return reply.send(docxBuffer)
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({ error: 'Failed to export book' })
  }
})

// Search routes
fastify.get('/api/search', async (request, reply) => {
  const { projectId, query } = request.query as { projectId: string; query: string }

  if (!projectId || !query || query.trim().length < 2) {
    return []
  }

  try {
    // Search in scene titles
    const scenesByTitle = await prisma.scene.findMany({
      where: {
        chapter: {
          book: {
            projectId,
          },
        },
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        chapter: {
          include: {
            book: true,
          },
        },
      },
      take: 20,
    })

    // Search in scene body (simple text search)
    const allScenes = await prisma.scene.findMany({
      where: {
        chapter: {
          book: {
            projectId,
          },
        },
      },
      include: {
        chapter: {
          include: {
            book: true,
          },
        },
      },
    })

    const scenesByBody = allScenes.filter(scene => {
      const text = extractTextFromScene(scene.body as unknown)
      return text.toLowerCase().includes(query.toLowerCase())
    })

    // Search in codex
    const codexEntries = await prisma.codexEntry.findMany({
      where: {
        projectId,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 20,
    })

    // Combine results
    const results = {
      scenes: Array.from(new Set([...scenesByTitle, ...scenesByBody.slice(0, 20)])).slice(0, 20),
      codexEntries,
      total: scenesByTitle.length + scenesByBody.length + codexEntries.length,
    }

    return results
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Search failed' })
  }
})

function extractTextFromScene(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const doc = body as Record<string, unknown>
  if (!doc.content || !Array.isArray(doc.content)) return ''

  return (doc.content as unknown[])
    .map(node => {
      if (typeof node !== 'object' || !node) return ''
      const n = node as Record<string, unknown>
      if (n.type === 'text' && typeof n.text === 'string') return n.text
      if (n.content && Array.isArray(n.content)) {
        return extractTextFromScene({ content: n.content })
      }
      return ''
    })
    .join(' ')
}

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
