import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('Search API', () => {
  let prisma: PrismaClient
  let testUserId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const user = await prisma.user.upsert({
      where: { email: 'test-search@example.com' },
      update: {},
      create: {
        id: 'test-user-search',
        email: 'test-search@example.com',
        name: 'Test User Search',
      },
    })
    testUserId = user.id
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  it('should find scenes by title', async () => {
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

    await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'The Beginning',
        status: 'DRAFT',
        order: 1,
        body: { type: 'doc', content: [] },
      },
    })

    // Simulate search query
    const scenes = await prisma.scene.findMany({
      where: {
        chapter: {
          book: {
            projectId: project.id,
          },
        },
        title: {
          contains: 'Beginning',
        },
      },
    })

    expect(scenes).toHaveLength(1)
    expect(scenes[0].title).toContain('Beginning')
  })

  it('should find codex entries by name', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: testUserId,
      },
    })

    await prisma.codexEntry.create({
      data: {
        projectId: project.id,
        type: 'character',
        name: 'Hero the Great',
        attributes: {},
      },
    })

    // Simulate search query
    const entries = await prisma.codexEntry.findMany({
      where: {
        projectId: project.id,
        name: {
          contains: 'Hero',
        },
      },
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].name).toContain('Hero')
  })
})
