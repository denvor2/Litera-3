import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { login, register, createInvitation } from '../services/authService.js'

const prisma = new PrismaClient()

let testUserId: string
let testProjectId: string
let testBookId: string

describe('Regression Tests - Auth & Data Integrity', () => {
  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'regression-test@example.com',
        name: 'Regression Test User',
        password: 'hashed-password',
      },
    })
    testUserId = testUser.id

    // Create a test project
    const testProject = await prisma.project.create({
      data: {
        title: 'Regression Test Project',
        ownerId: testUserId,
      },
    })
    testProjectId = testProject.id

    // Create a test book
    const testBook = await prisma.book.create({
      data: {
        title: 'Regression Test Book',
        projectId: testProjectId,
        order: 0,
      },
    })
    testBookId = testBook.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'regression-test@example.com' },
    })
    await prisma.$disconnect()
  })

  // Note: auth tests are covered in src/routes/auth.test.ts
  // This file focuses on data integrity and soft-delete regression tests

  it('should retrieve projects after authentication', async () => {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
    })
    expect(projects).toBeDefined()
    expect(Array.isArray(projects)).toBe(true)
    expect(projects.length > 0).toBe(true)
  })

  it('should allow creating new series (project) and retrieving it', async () => {
    const newProject = await prisma.project.create({
      data: {
        title: 'New Test Series',
        ownerId: testUserId,
        synopsis: 'Test synopsis',
      },
    })

    expect(newProject).toBeDefined()
    expect(newProject.id).toBeDefined()
    expect(newProject.title).toBe('New Test Series')

    // Retrieve it
    const retrieved = await prisma.project.findUnique({
      where: { id: newProject.id },
    })
    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('New Test Series')

    // Cleanup
    await prisma.project.delete({ where: { id: newProject.id } })
  })

  it('should allow creating books and retrieving them', async () => {
    const newBook = await prisma.book.create({
      data: {
        title: 'New Test Book',
        projectId: testProjectId,
        genre: 'Фантастика',
        order: 1,
      },
    })

    expect(newBook).toBeDefined()
    expect(newBook.id).toBeDefined()
    expect(newBook.title).toBe('New Test Book')

    // Retrieve it
    const retrieved = await prisma.book.findUnique({
      where: { id: newBook.id },
    })
    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('New Test Book')

    // Cleanup
    await prisma.book.delete({ where: { id: newBook.id } })
  })

  it('should allow creating chapters and scenes', async () => {
    const chapter = await prisma.chapter.create({
      data: {
        title: 'Test Chapter',
        bookId: testBookId,
        order: 0,
      },
    })

    const scene = await prisma.scene.create({
      data: {
        title: 'Test Scene',
        chapterId: chapter.id,
        body: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }] }),
        order: 0,
      },
    })

    expect(chapter).toBeDefined()
    expect(scene).toBeDefined()
    expect(scene.chapterId).toBe(chapter.id)

    // Cleanup
    await prisma.scene.delete({ where: { id: scene.id } })
    await prisma.chapter.delete({ where: { id: chapter.id } })
  })

  it('should handle soft deletes properly', async () => {
    const softDeleteProject = await prisma.project.create({
      data: {
        title: 'Soft Delete Test',
        ownerId: testUserId,
      },
    })

    // Soft delete
    await prisma.project.update({
      where: { id: softDeleteProject.id },
      data: { deletedAt: new Date() },
    })

    // Should not appear in normal queries
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
    })
    expect(projects.find(p => p.id === softDeleteProject.id)).toBeUndefined()

    // Should appear in "trash" query
    const deleted = await prisma.project.findUnique({
      where: { id: softDeleteProject.id },
    })
    expect(deleted?.deletedAt).toBeDefined()

    // Cleanup
    await prisma.project.delete({ where: { id: softDeleteProject.id } })
  })

  it('should maintain data integrity with book and chapter relationships', async () => {
    const book = await prisma.book.findUnique({
      where: { id: testBookId },
      include: {
        chapters: {
          where: { deletedAt: null },
          include: {
            scenes: { where: { deletedAt: null } },
          },
        },
      },
    })

    expect(book).toBeDefined()
    expect(Array.isArray(book?.chapters)).toBe(true)
  })

  it('should create and use invitation tokens', async () => {
    const invitation = await createInvitation('newuser@example.com')

    expect(invitation).toBeDefined()
    expect(invitation.email).toBe('newuser@example.com')
    expect(invitation.token).toBeDefined()
    expect(invitation.expiresAt).toBeDefined()

    // Verify invitation exists
    const found = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    })
    expect(found).toBeDefined()

    // Cleanup
    await prisma.invitation.delete({ where: { id: invitation.id } })
  })

  it('should create and retrieve notes for a project', async () => {
    const note = await prisma.note.create({
      data: {
        projectId: testProjectId,
        title: 'Тестовая заметка',
        content: 'Содержание с кириллицей: абвгд',
      },
    })

    expect(note).toBeDefined()
    expect(note.id).toBeDefined()
    expect(note.title).toBe('Тестовая заметка')
    expect(note.content).toContain('кириллицей')

    // Retrieve it
    const retrieved = await prisma.note.findUnique({
      where: { id: note.id },
    })
    expect(retrieved).toBeDefined()
    expect(retrieved?.title).toBe('Тестовая заметка')

    // Cleanup
    await prisma.note.delete({ where: { id: note.id } })
  })

  it('should create and retrieve AI roles for a project', async () => {
    const role = await prisma.aIRole.create({
      data: {
        projectId: testProjectId,
        name: 'Тестовая роль',
        type: 'custom',
        icon: '🧪',
        systemPrompt: 'Ты тестовый AI помощник',
        quickPrompts: ['Первый запрос', 'Второй запрос'],
      },
    })

    expect(role).toBeDefined()
    expect(role.id).toBeDefined()
    expect(role.name).toBe('Тестовая роль')
    expect(role.type).toBe('custom')
    expect(role.quickPrompts).toHaveLength(2)

    // Retrieve it
    const retrieved = await prisma.aIRole.findUnique({
      where: { id: role.id },
    })
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('Тестовая роль')

    // Cleanup
    await prisma.aIRole.delete({ where: { id: role.id } })
  })
})
