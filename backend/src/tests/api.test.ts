import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('API', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
  })

  it('should create a project', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: 'test-user',
      },
    })

    expect(project).toBeDefined()
    expect(project.title).toBe('Test Project')
  })

  it('should create a book in a project', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: 'test-user',
      },
    })

    const book = await prisma.book.create({
      data: {
        projectId: project.id,
        title: 'Test Book',
        order: 1,
      },
    })

    expect(book).toBeDefined()
    expect(book.projectId).toBe(project.id)
  })

  it('should create a chapter in a book', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: 'test-user',
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

    expect(chapter).toBeDefined()
    expect(chapter.bookId).toBe(book.id)
  })

  it('should create a scene in a chapter', async () => {
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: 'test-user',
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

    expect(scene).toBeDefined()
    expect(scene.chapterId).toBe(chapter.id)
    expect(scene.status).toBe('DRAFT')
  })
})
