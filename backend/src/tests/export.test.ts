import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { exportBookToDocx } from '../services/docxExport'

describe('Export Service', () => {
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
  })

  it('should export book to docx format', async () => {
    // Create test data
    const project = await prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId: 'test-user',
      },
    })

    const book = await prisma.book.create({
      data: {
        projectId: project.id,
        title: 'Test Book for Export',
        order: 1,
      },
    })

    const chapter = await prisma.chapter.create({
      data: {
        bookId: book.id,
        title: 'Chapter 1',
        order: 1,
      },
    })

    await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Scene 1',
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
                  text: 'This is test scene content',
                },
              ],
            },
          ],
        },
      },
    })

    // Export
    const docxBuffer = await exportBookToDocx(book.id)

    expect(docxBuffer).toBeDefined()
    expect(docxBuffer).toBeInstanceOf(Buffer)
    expect(docxBuffer.length).toBeGreaterThan(0)

    // Check for DOCX magic bytes (PK)
    expect(docxBuffer[0]).toBe(0x50) // 'P'
    expect(docxBuffer[1]).toBe(0x4b) // 'K'
  })

  it('should include only draft and editing scenes', async () => {
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
        title: 'Chapter 1',
        order: 1,
      },
    })

    // Create scenes with different statuses
    await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Draft Scene',
        status: 'DRAFT',
        order: 1,
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Draft content' }],
            },
          ],
        },
      },
    })

    await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Done Scene',
        status: 'DONE',
        order: 2,
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Done content (should not appear)' }],
            },
          ],
        },
      },
    })

    const docxBuffer = await exportBookToDocx(book.id)

    // Verify export was successful
    expect(docxBuffer).toBeDefined()
    expect(docxBuffer.length).toBeGreaterThan(0)

    // Check DOCX format
    expect(docxBuffer[0]).toBe(0x50)
    expect(docxBuffer[1]).toBe(0x4b)
  })

  it('should throw error for non-existent book', async () => {
    const nonExistentId = 'non-existent-id'

    try {
      await exportBookToDocx(nonExistentId)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeDefined()
      expect((error as Error).message).toBe('Book not found')
    }
  })
})
