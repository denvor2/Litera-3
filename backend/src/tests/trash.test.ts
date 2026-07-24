import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('Soft-delete и Корзина', () => {
  let prisma: PrismaClient
  let testUserId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const user = await prisma.user.upsert({
      where: { email: 'test-trash@example.com' },
      update: {},
      create: {
        id: 'test-user-trash',
        email: 'test-trash@example.com',
        name: 'Test User Trash',
      },
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Soft-delete test projects
    await prisma.project.updateMany({
      where: { title: { in: ['Проект корзины', 'Test Project'] }, ownerId: testUserId },
      data: { deletedAt: new Date() }
    })
    // Hard-delete test user
    await prisma.user.deleteMany({
      where: { email: 'test-trash@example.com' }
    })
    await prisma.$disconnect()
  })

  async function makeTree() {
    const project = await prisma.project.create({
      data: { title: 'Проект корзины', ownerId: testUserId },
    })
    const book = await prisma.book.create({
      data: { projectId: project.id, title: 'Книга', order: 1 },
    })
    const chapter = await prisma.chapter.create({
      data: { bookId: book.id, title: 'Глава', order: 1 },
    })
    const scene = await prisma.scene.create({
      data: { chapterId: chapter.id, title: 'Сцена', status: 'DRAFT', order: 1 },
    })
    return { project, book, chapter, scene }
  }

  it('happy path: soft-delete сцены скрывает её из активного findMany, но кладёт в корзину', async () => {
    const { project, chapter, scene } = await makeTree()

    // Мягкое удаление (как DELETE /api/scenes/:id)
    await prisma.scene.update({
      where: { id: scene.id },
      data: { deletedAt: new Date() },
    })

    // Активный список исключает удалённую сцену
    const active = await prisma.scene.findMany({
      where: { chapterId: chapter.id, deletedAt: null },
    })
    expect(active.find(s => s.id === scene.id)).toBeUndefined()

    // Корзина (как GET /api/trash/:projectId) возвращает удалённую сцену
    const trashed = await prisma.scene.findMany({
      where: {
        chapter: { book: { projectId: project.id } },
        deletedAt: { not: null },
      },
    })
    expect(trashed.find(s => s.id === scene.id)).toBeDefined()
  })

  it('happy path: восстановление книги/главы/сцены обнуляет deletedAt', async () => {
    const { book, chapter, scene } = await makeTree()
    const now = new Date()
    await prisma.book.update({ where: { id: book.id }, data: { deletedAt: now } })
    await prisma.chapter.update({ where: { id: chapter.id }, data: { deletedAt: now } })
    await prisma.scene.update({ where: { id: scene.id }, data: { deletedAt: now } })

    // restore endpoints
    const rBook = await prisma.book.update({ where: { id: book.id }, data: { deletedAt: null } })
    const rChapter = await prisma.chapter.update({ where: { id: chapter.id }, data: { deletedAt: null } })
    const rScene = await prisma.scene.update({ where: { id: scene.id }, data: { deletedAt: null } })

    expect(rBook.deletedAt).toBeNull()
    expect(rChapter.deletedAt).toBeNull()
    expect(rScene.deletedAt).toBeNull()

    // После восстановления сцена снова в активном списке
    const active = await prisma.scene.findMany({
      where: { chapterId: chapter.id, deletedAt: null },
    })
    expect(active.find(s => s.id === scene.id)).toBeDefined()
  })

  it('happy path: удалённая книга не появляется в GET /api/books/:projectId', async () => {
    const { project, book } = await makeTree()
    await prisma.book.update({ where: { id: book.id }, data: { deletedAt: new Date() } })

    const books = await prisma.book.findMany({
      where: { projectId: project.id, deletedAt: null },
    })
    expect(books.find(b => b.id === book.id)).toBeUndefined()
  })

  it('граничная ситуация: восстановление уже активной сцены идемпотентно (deletedAt остаётся null)', async () => {
    const { scene } = await makeTree()
    // Сцена никогда не удалялась
    const restored = await prisma.scene.update({
      where: { id: scene.id },
      data: { deletedAt: null },
    })
    expect(restored.deletedAt).toBeNull()
  })

  it('граничная ситуация: восстановление несуществующей книги бросает ошибку Prisma', async () => {
    await expect(
      prisma.book.update({ where: { id: 'no-such-book' }, data: { deletedAt: null } })
    ).rejects.toThrow()
  })
})
