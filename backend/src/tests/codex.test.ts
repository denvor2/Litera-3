import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('Codex API', () => {
  let prisma: PrismaClient
  let testUserId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const user = await prisma.user.upsert({
      where: { email: 'test-codex@example.com' },
      update: {},
      create: {
        id: 'test-user-codex',
        email: 'test-codex@example.com',
        name: 'Test User Codex',
      },
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Soft-delete test projects (same as in app)
    await prisma.project.updateMany({
      where: { title: 'Test Project', ownerId: testUserId },
      data: { deletedAt: new Date() }
    })
    // Hard-delete test user
    await prisma.user.deleteMany({
      where: { email: 'test-codex@example.com' }
    })
    await prisma.$disconnect()
  })

  it('should create a character', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: testUserId,
      },
    })

    const character = await prisma.codexEntry.create({
      data: {
        projectId: project.id,
        type: 'character',
        name: 'John Doe',
        attributes: {
          appearance: 'Tall, blue eyes',
          personality: 'Brave and confident',
          goal_conflict: 'Wants to save the world',
        },
      },
    })

    expect(character).toBeDefined()
    expect(character.type).toBe('character')
    expect(character.name).toBe('John Doe')
  })

  it('should create a location', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: testUserId,
      },
    })

    const location = await prisma.codexEntry.create({
      data: {
        projectId: project.id,
        type: 'location',
        name: 'Dark Forest',
        attributes: {
          description: 'A mysterious and dangerous forest',
        },
      },
    })

    expect(location).toBeDefined()
    expect(location.type).toBe('location')
    expect(location.name).toBe('Dark Forest')
  })

  it('should link scene to codex entry', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: testUserId,
      },
    })

    const book = await prisma.book.create({
      data: {
        projectId: project.id,
        title: 'Test Book',
        order: 1,
      },
    })

    const chapter = await prisma.chapter.create({
      data: {
        bookId: book.id,
        title: 'Test Chapter',
        order: 1,
      },
    })

    const scene = await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Test Scene',
        status: 'DRAFT',
        order: 1,
      },
    })

    const character = await prisma.codexEntry.create({
      data: {
        projectId: project.id,
        type: 'character',
        name: 'Hero',
        attributes: {},
      },
    })

    const link = await prisma.sceneEntityLink.create({
      data: {
        sceneId: scene.id,
        codexEntryId: character.id,
      },
    })

    expect(link).toBeDefined()
    expect(link.sceneId).toBe(scene.id)
    expect(link.codexEntryId).toBe(character.id)
  })
})
