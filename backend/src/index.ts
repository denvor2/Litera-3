import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { exportBookToDocx } from './services/docxExport.js'
import { exportBookToFb2 } from './services/fbExport.js'
import { exportBookToPdf } from './services/pdfExport.js'
import { extractTextFromTipTap } from './utils/tiptap.js'
import { getDispositionHeader } from './utils/httpHeaders.js'
import { queryAI, initializeAIRolesForProject, initializeFieldPromptsForProject } from './services/aiService.js'

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
    where: { deletedAt: null },
    include: {
      books: {
        where: { deletedAt: null },
        include: {
          chapters: {
            where: { deletedAt: null },
            include: {
              scenes: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
      codexEntries: {
        where: { deletedAt: null },
      },
      notes: {
        where: { deletedAt: null },
      },
    },
  })
  return projects
})

fastify.post('/api/projects', async (request, reply) => {
  const { title, ownerId, synopsis } = request.body as { title: string; ownerId: string; synopsis?: string }

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
        synopsis,
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

    // Initialize AI roles and field prompts
    await initializeAIRolesForProject(project.id)
    await initializeFieldPromptsForProject(project.id)

    return project
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to create project' })
  }
})

fastify.put('/api/projects/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const { title, synopsis } = request.body as { title?: string; synopsis?: string }

  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(title && { title }),
        ...(synopsis !== undefined && { synopsis }),
      },
      include: {
        books: {
          where: { deletedAt: null },
          include: {
            chapters: {
              where: { deletedAt: null },
              include: {
                scenes: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
        codexEntries: {
          where: { deletedAt: null },
        },
        notes: {
          where: { deletedAt: null },
        },
      },
    })
    return project
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update project' })
  }
})

fastify.delete('/api/projects/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      reply.code(404).send({ error: 'Project not found' })
      return
    }

    if (project.isDefault) {
      reply.code(403).send({ error: 'Cannot delete default project' })
      return
    }

    // Soft delete: set deletedAt instead of removing
    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete project' })
  }
})

// Restore project from trash
fastify.patch('/api/projects/:projectId/restore', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }

  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: null },
      include: {
        books: {
          where: { deletedAt: null },
          include: {
            chapters: {
              where: { deletedAt: null },
              include: {
                scenes: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
        codexEntries: {
          where: { deletedAt: null },
        },
        notes: {
          where: { deletedAt: null },
        },
      },
    })
    return project
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore project' })
  }
})

// Books routes
fastify.get('/api/books/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const books = await prisma.book.findMany({
    where: { projectId, deletedAt: null },
    include: {
      chapters: {
        where: { deletedAt: null },
        include: {
          scenes: {
            where: { deletedAt: null },
          },
        },
      },
    },
  })
  return books
})

fastify.post('/api/books', async (request, reply) => {
  const { projectId, title, genre, description, synopsis, plannedCharCount, plannedAuthorSheets } = request.body as {
    projectId: string
    title: string
    genre?: string
    description?: string
    synopsis?: string
    plannedCharCount?: number
    plannedAuthorSheets?: number
  }
  const maxOrder = await prisma.book.findFirst({
    where: { projectId, deletedAt: null },
    orderBy: { order: 'desc' },
  })

  const book = await prisma.book.create({
    data: {
      projectId,
      title,
      genre: genre || null,
      description: description || null,
      synopsis: synopsis || null,
      plannedCharCount: plannedCharCount || null,
      plannedAuthorSheets: plannedAuthorSheets || null,
      order: (maxOrder?.order ?? 0) + 1,
    },
    include: {
      chapters: {
        where: { deletedAt: null },
        include: {
          scenes: {
            where: { deletedAt: null },
          },
        },
      },
    },
  })
  return book
})

fastify.put('/api/books/:bookId', async (request, reply) => {
  const { bookId } = request.params as { bookId: string }
  const { title, genre, description, synopsis, plannedCharCount, plannedAuthorSheets } = request.body as {
    title?: string
    genre?: string
    description?: string
    synopsis?: string
    plannedCharCount?: number | null
    plannedAuthorSheets?: number | null
  }

  try {
    const updateData: any = {}
    if (title) updateData.title = title
    if (genre !== undefined) updateData.genre = genre || null
    if (description !== undefined) updateData.description = description || null
    if (synopsis !== undefined) updateData.synopsis = synopsis || null
    if (plannedCharCount !== undefined) updateData.plannedCharCount = plannedCharCount || null
    if (plannedAuthorSheets !== undefined) updateData.plannedAuthorSheets = plannedAuthorSheets || null

    const book = await prisma.book.update({
      where: { id: bookId },
      data: updateData,
      include: {
        chapters: {
          where: { deletedAt: null },
          include: {
            scenes: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })
    return book
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update book' })
  }
})

fastify.delete('/api/books/:bookId', async (request, reply) => {
  const { bookId } = request.params as { bookId: string }

  try {
    await prisma.book.update({
      where: { id: bookId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete book' })
  }
})

// Chapters routes
fastify.post('/api/chapters', async (request, reply) => {
  const { bookId, title } = request.body as { bookId: string; title: string }
  const maxOrder = await prisma.chapter.findFirst({
    where: { bookId, deletedAt: null },
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

fastify.put('/api/chapters/:chapterId', async (request, reply) => {
  const { chapterId } = request.params as { chapterId: string }
  const { title } = request.body as { title?: string }

  try {
    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { ...(title && { title }) },
    })
    return chapter
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update chapter' })
  }
})

fastify.delete('/api/chapters/:chapterId', async (request, reply) => {
  const { chapterId } = request.params as { chapterId: string }

  try {
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete chapter' })
  }
})

// Scenes routes
fastify.get('/api/scenes/:chapterId', async (request, reply) => {
  const { chapterId } = request.params as { chapterId: string }
  const scenes = await prisma.scene.findMany({
    where: { chapterId, deletedAt: null },
    orderBy: { order: 'asc' },
  })
  return scenes
})

fastify.post('/api/scenes', async (request, reply) => {
  const { chapterId, title, status, targetWordCount } = request.body as {
    chapterId: string
    title: string
    status?: string
    targetWordCount?: number | null
  }
  const maxOrder = await prisma.scene.findFirst({
    where: { chapterId },
    orderBy: { order: 'desc' },
  })

  const scene = await prisma.scene.create({
    data: {
      chapterId,
      title,
      status: (status?.toUpperCase() as any) || 'DRAFT',
      targetWordCount: targetWordCount || null,
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
  const { title, status, povCharacterId, body, notes, wordCount, targetWordCount } = request.body as {
    title?: string
    status?: string
    povCharacterId?: string | null
    body?: unknown
    notes?: string
    wordCount?: number
    targetWordCount?: number | null
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
          snapshot: currentScene.body as any,
        },
      })
    }

    const updateData: any = {}
    if (title) updateData.title = title
    if (status) updateData.status = status
    if (povCharacterId !== undefined) updateData.povCharacterId = povCharacterId
    if (body) updateData.body = body as any
    if (notes !== undefined) updateData.notes = notes
    if (wordCount !== undefined) updateData.wordCount = wordCount
    if (targetWordCount !== undefined) updateData.targetWordCount = targetWordCount

    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: updateData,
    })

    return updatedScene
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update scene' })
  }
})

fastify.delete('/api/scenes/:sceneId', async (request, reply) => {
  const { sceneId } = request.params as { sceneId: string }

  try {
    await prisma.scene.update({
      where: { id: sceneId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete scene' })
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
    where: { projectId, deletedAt: null },
  })
  return entries
})

fastify.get('/api/codex/:projectId/characters', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const entries = await prisma.codexEntry.findMany({
    where: { projectId, type: 'character', deletedAt: null },
  })
  return entries
})

fastify.get('/api/codex/:projectId/locations', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const entries = await prisma.codexEntry.findMany({
    where: { projectId, type: 'location', deletedAt: null },
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
    const entry = await prisma.codexEntry.create({
      data: {
        projectId,
        type,
        name,
        attributes: attributes || {},
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
    const updateData: any = {}
    if (name) updateData.name = name
    if (attributes !== undefined) updateData.attributes = attributes as any

    const entry = await prisma.codexEntry.update({
      where: { id: entryId },
      data: updateData,
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
    await prisma.codexEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete codex entry' })
  }
})

fastify.get('/api/codex-entries/:entryId/mentions', async (request, reply) => {
  const { entryId } = request.params as { entryId: string }

  try {
    const links = await prisma.sceneEntityLink.findMany({
      where: { codexEntryId: entryId },
      include: {
        scene: {
          include: {
            chapter: {
              include: {
                book: true,
              },
            },
          },
        },
      },
    })

    const mentions = links.map((link) => ({
      sceneId: link.scene.id,
      sceneTitle: link.scene.title,
      chapterTitle: link.scene.chapter.title,
      bookTitle: link.scene.chapter.book.title,
    }))

    return mentions
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to get mentions' })
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

// Notes routes
fastify.get('/api/notes/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  try {
    const notes = await prisma.note.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return notes
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to fetch notes' })
  }
})

fastify.post('/api/notes', async (request, reply) => {
  const { projectId, title, content } = request.body as { projectId: string; title: string; content?: string }

  try {
    const note = await prisma.note.create({
      data: {
        projectId,
        title,
        content: content || '',
      },
    })
    return note
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to create note' })
  }
})

fastify.put('/api/notes/:noteId', async (request, reply) => {
  const { noteId } = request.params as { noteId: string }
  const { title, content } = request.body as { title?: string; content?: string }

  try {
    const updateData: any = {}
    if (title) updateData.title = title
    if (content !== undefined) updateData.content = content

    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    })
    return note
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update note' })
  }
})

fastify.delete('/api/notes/:noteId', async (request, reply) => {
  const { noteId } = request.params as { noteId: string }

  try {
    await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to delete note' })
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
          snapshot: currentScene.body as any,
        },
      })
    }

    // Restore scene
    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        body: version.snapshot as any,
      },
    })

    return updatedScene
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore version' })
  }
})

// Trash routes
fastify.get('/api/trash/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }

  try {
    const deletedBooks = await prisma.book.findMany({
      where: { projectId, deletedAt: { not: null } },
      include: {
        chapters: {
          where: { deletedAt: { not: null } },
        },
      },
    })

    const deletedChapters = await prisma.chapter.findMany({
      where: {
        book: { projectId },
        deletedAt: { not: null },
      },
      include: {
        book: true,
      },
    })

    const deletedScenes = await prisma.scene.findMany({
      where: {
        chapter: {
          book: {
            projectId,
          },
        },
        deletedAt: { not: null },
      },
      include: {
        chapter: {
          include: {
            book: true,
          },
        },
      },
    })

    const deletedCodexEntries = await prisma.codexEntry.findMany({
      where: { projectId, deletedAt: { not: null } },
    })

    return {
      books: deletedBooks,
      chapters: deletedChapters,
      scenes: deletedScenes,
      codexEntries: deletedCodexEntries,
    }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to fetch trash' })
  }
})

fastify.put('/api/trash/book/:bookId/restore', async (request, reply) => {
  const { bookId } = request.params as { bookId: string }

  try {
    const book = await prisma.book.update({
      where: { id: bookId },
      data: { deletedAt: null },
    })
    return book
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore book' })
  }
})

fastify.put('/api/trash/chapter/:chapterId/restore', async (request, reply) => {
  const { chapterId } = request.params as { chapterId: string }

  try {
    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { deletedAt: null },
    })
    return chapter
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore chapter' })
  }
})

fastify.put('/api/trash/scene/:sceneId/restore', async (request, reply) => {
  const { sceneId } = request.params as { sceneId: string }

  try {
    const scene = await prisma.scene.update({
      where: { id: sceneId },
      data: { deletedAt: null },
    })
    return scene
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore scene' })
  }
})

fastify.put('/api/trash/codexentry/:entryId/restore', async (request, reply) => {
  const { entryId } = request.params as { entryId: string }

  try {
    const entry = await prisma.codexEntry.update({
      where: { id: entryId },
      data: { deletedAt: null },
    })
    return entry
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to restore codex entry' })
  }
})

// Permanent delete routes
fastify.delete('/api/trash/book/:bookId/permanent', async (request, reply) => {
  const { bookId } = request.params as { bookId: string }

  try {
    await prisma.book.delete({ where: { id: bookId } })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to permanently delete book' })
  }
})

fastify.delete('/api/trash/chapter/:chapterId/permanent', async (request, reply) => {
  const { chapterId } = request.params as { chapterId: string }

  try {
    await prisma.chapter.delete({ where: { id: chapterId } })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to permanently delete chapter' })
  }
})

fastify.delete('/api/trash/scene/:sceneId/permanent', async (request, reply) => {
  const { sceneId } = request.params as { sceneId: string }

  try {
    await prisma.scene.delete({ where: { id: sceneId } })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to permanently delete scene' })
  }
})

fastify.delete('/api/trash/codexentry/:entryId/permanent', async (request, reply) => {
  const { entryId } = request.params as { entryId: string }

  try {
    await prisma.codexEntry.delete({ where: { id: entryId } })
    return { success: true }
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to permanently delete codex entry' })
  }
})

// Export routes
fastify.get('/api/books/:bookId/export', async (request, reply) => {
  const { bookId } = request.params as { bookId: string }
  const { format } = request.query as { format?: string }

  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      reply.code(404).send({ error: 'Book not found' })
      return
    }

    if (format === 'fb2') {
      const fb2Content = await exportBookToFb2(bookId)
      reply.type('application/xml')
      reply.header('Content-Disposition', getDispositionHeader(book.title, 'fb2'))
      return reply.send(fb2Content)
    }

    if (format === 'pdf') {
      const pdfBuffer = await exportBookToPdf(bookId)
      reply.type('application/pdf')
      reply.header('Content-Disposition', getDispositionHeader(book.title, 'pdf'))
      return reply.send(pdfBuffer)
    }

    // Default to docx
    const docxBuffer = await exportBookToDocx(bookId)
    reply.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    reply.header('Content-Disposition', getDispositionHeader(book.title, 'docx'))
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
        deletedAt: null,
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
        deletedAt: null,
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
      try {
        const text = extractTextFromTipTap(scene.body as any)
        return text.toLowerCase().includes(query.toLowerCase())
      } catch {
        return false
      }
    })

    // Search in codex
    const codexEntries = await prisma.codexEntry.findMany({
      where: {
        projectId,
        deletedAt: null,
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

// AI routes
fastify.post('/api/ai-query', async (request, reply) => {
  const {
    bookId,
    role,
    scope,
    scopeId,
    scopeLabel,
    scopeText,
    userMessage,
    customPrompt,
  } = request.body as {
    bookId: string
    role: string
    scope: string
    scopeId?: string
    scopeLabel?: string
    scopeText: string
    userMessage: string
    customPrompt?: string
  }

  try {
    const result = await queryAI({
      bookId,
      role,
      scope: scope as any,
      scopeId,
      scopeLabel,
      scopeText,
      userMessage,
      customPrompt,
    })

    if (!result.success) {
      reply.code(400).send(result)
      return
    }

    return result
  } catch (error: any) {
    fastify.log.error(error)
    reply.code(500).send({ error: error.message || 'AI query failed' })
  }
})

// Get AI roles for a project
fastify.get('/api/ai-roles/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }

  try {
    let roles = await prisma.aIRole.findMany({
      where: { projectId, isDeleted: false },
    })

    // If no roles exist, initialize them
    if (roles.length === 0) {
      await initializeAIRolesForProject(projectId)
      await initializeFieldPromptsForProject(projectId)
      roles = await prisma.aIRole.findMany({
        where: { projectId, isDeleted: false },
      })
    }

    return roles
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to fetch AI roles' })
  }
})

// Create or update AI role
fastify.put('/api/ai-roles/:roleId', async (request, reply) => {
  const { roleId } = request.params as { roleId: string }
  const { name, icon, systemPrompt, quickPrompts, model } = request.body as {
    name?: string
    icon?: string
    systemPrompt?: string
    quickPrompts?: string[]
    model?: string
  }

  // Валидация
  if (name !== undefined && (!name.trim())) {
    return reply.code(400).send({ error: 'Имя роли не может быть пустым' })
  }
  if (systemPrompt !== undefined && (!systemPrompt.trim())) {
    return reply.code(400).send({ error: 'Системный промпт не может быть пустым' })
  }
  if (quickPrompts !== undefined) {
    if (!Array.isArray(quickPrompts)) {
      return reply.code(400).send({ error: 'Типовые запросы должны быть массивом' })
    }
    if (quickPrompts.length > 6) {
      return reply.code(400).send({ error: 'Максимум 6 типовых запросов' })
    }
    if (quickPrompts.some(p => !p.trim())) {
      return reply.code(400).send({ error: 'Типовые запросы не могут быть пустыми' })
    }
  }

  try {
    const updateData: any = {}
    if (name) updateData.name = name
    if (icon) updateData.icon = icon
    if (systemPrompt) updateData.systemPrompt = systemPrompt
    if (quickPrompts) updateData.quickPrompts = quickPrompts
    if (model) updateData.model = model

    const role = await prisma.aIRole.update({
      where: { id: roleId },
      data: updateData,
    })
    return role
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update AI role' })
  }
})

// Create custom AI role
fastify.post('/api/ai-roles', async (request, reply) => {
  const { projectId, name, icon, systemPrompt, quickPrompts } = request.body as {
    projectId: string
    name: string
    icon?: string
    systemPrompt: string
    quickPrompts: string[]
  }

  // Валидация
  if (!name || !name.trim()) {
    return reply.code(400).send({ error: 'Имя роли не может быть пустым' })
  }
  if (!systemPrompt || !systemPrompt.trim()) {
    return reply.code(400).send({ error: 'Системный промпт не может быть пустым' })
  }
  if (!Array.isArray(quickPrompts)) {
    return reply.code(400).send({ error: 'Типовые запросы должны быть массивом' })
  }
  if (quickPrompts.length > 6) {
    return reply.code(400).send({ error: 'Максимум 6 типовых запросов' })
  }
  if (quickPrompts.some(p => !p.trim())) {
    return reply.code(400).send({ error: 'Типовые запросы не могут быть пустыми' })
  }

  try {
    const role = await prisma.aIRole.create({
      data: {
        projectId,
        name,
        type: 'custom',
        icon: icon || '⭐',
        systemPrompt,
        quickPrompts,
      },
    })
    return role
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to create AI role' })
  }
})

// Get field prompts for a project
fastify.get('/api/ai-field-prompts/:projectId', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }

  try {
    const prompts = await prisma.aIFieldPrompts.findMany({
      where: { projectId },
    })
    return prompts
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to fetch field prompts' })
  }
})

// Get user preferences
fastify.get('/api/user-preferences/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string }

  try {
    let prefs = await prisma.userPreferences.findFirst({
      where: { sessionId },
    })

    if (!prefs) {
      prefs = await prisma.userPreferences.create({
        data: { sessionId },
      })
    }

    return prefs
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to fetch preferences' })
  }
})

// Update user preferences
fastify.put('/api/user-preferences/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string }
  const { aiPanelWidth } = request.body as { aiPanelWidth?: number }

  try {
    // Check if exists first
    let prefs = await prisma.userPreferences.findFirst({
      where: { sessionId },
    })

    if (prefs) {
      prefs = await prisma.userPreferences.update({
        where: { id: prefs.id },
        data: { ...(aiPanelWidth && { aiPanelWidth }) },
      })
    } else {
      prefs = await prisma.userPreferences.create({
        data: {
          sessionId,
          aiPanelWidth: aiPanelWidth || 280,
        },
      })
    }
    return prefs
  } catch (error) {
    fastify.log.error(error)
    reply.code(400).send({ error: 'Failed to update preferences' })
  }
})

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    fastify.log.info('Server running on http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
