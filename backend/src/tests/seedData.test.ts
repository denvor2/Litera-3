import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

/**
 * Проверяет, что тестовые/сид-данные пишут body сцены как нативный JSON (JSONB),
 * а не как строку JSON.stringify(...). После миграции на PostgreSQL колонка body — JSONB,
 * и Prisma должна возвращать объект, а не строку.
 */
describe('Seed / тестовые данные (JSONB body)', () => {
  let prisma: PrismaClient
  let testUserId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const user = await prisma.user.upsert({
      where: { email: 'test-seed@example.com' },
      update: {},
      create: {
        id: 'test-user-seed',
        email: 'test-seed@example.com',
        name: 'Test User Seed',
      },
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Soft-delete test projects
    await prisma.project.updateMany({
      where: { title: 'Сид-проект', ownerId: testUserId },
      data: { deletedAt: new Date() }
    })
    // Hard-delete test user
    await prisma.user.deleteMany({
      where: { email: 'test-seed@example.com' }
    })
    await prisma.$disconnect()
  })

  it('happy path: сцена создаётся с body-объектом и читается как объект (JSONB), не строка', async () => {
    const project = await prisma.project.create({
      data: { title: 'Сид-проект', ownerId: testUserId },
    })
    const book = await prisma.book.create({
      data: { projectId: project.id, title: 'Сид-книга', order: 1 },
    })
    const chapter = await prisma.chapter.create({
      data: { bookId: book.id, title: 'Сид-глава', order: 1 },
    })

    const seedBody = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Начните писать свою историю...' }],
        },
      ],
    }

    const scene = await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Сцена 1',
        status: 'DRAFT',
        order: 1,
        body: seedBody,
      },
    })

    // Читаем заново из БД
    const fromDb = await prisma.scene.findUnique({ where: { id: scene.id } })
    expect(fromDb).not.toBeNull()

    // body должен быть объектом, а не строкой
    expect(typeof fromDb!.body).toBe('object')
    expect(typeof fromDb!.body).not.toBe('string')

    // Структура сохранена без двойной сериализации
    const body = fromDb!.body as typeof seedBody
    expect(body.type).toBe('doc')
    expect(body.content[0].type).toBe('paragraph')
    expect(body.content[0].content[0].text).toBe('Начните писать свою историю...')
  })

  it('граничная ситуация: attributes у codex-записи тоже нативный JSON-объект', async () => {
    const project = await prisma.project.create({
      data: { title: 'Сид-проект-2', ownerId: testUserId },
    })
    const entry = await prisma.codexEntry.create({
      data: {
        projectId: project.id,
        type: 'character',
        name: 'Герой',
        attributes: { appearance: 'высокий', personality: 'смелый' },
      },
    })
    const fromDb = await prisma.codexEntry.findUnique({ where: { id: entry.id } })
    expect(typeof fromDb!.attributes).toBe('object')
    expect((fromDb!.attributes as Record<string, string>).appearance).toBe('высокий')
  })
})
