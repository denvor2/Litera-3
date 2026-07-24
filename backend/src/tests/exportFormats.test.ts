import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { exportBookToFb2 } from '../services/fbExport'
import { exportBookToPdf } from '../services/pdfExport'

const cyrillicBody = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Тёмный лес шумел под ветром. Герой шагнул вперёд.' }],
    },
  ],
}

describe('FB2 и PDF экспорт', () => {
  let prisma: PrismaClient
  let testUserId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const user = await prisma.user.upsert({
      where: { email: 'test-formats@example.com' },
      update: {},
      create: {
        id: 'test-user-formats',
        email: 'test-formats@example.com',
        name: 'Test User Formats',
        password: 'test-password-hash',
      },
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Soft-delete test projects
    await prisma.project.updateMany({
      where: { title: { in: ['Проект экспорта', 'Test Project'] }, ownerId: testUserId },
      data: { deletedAt: new Date() }
    })
    // Hard-delete test user
    await prisma.user.deleteMany({
      where: { email: 'test-formats@example.com' }
    })
    await prisma.$disconnect()
  })

  async function makeBook(title: string) {
    const project = await prisma.project.create({
      data: { title: 'Проект экспорта', ownerId: testUserId },
    })
    const book = await prisma.book.create({
      data: { projectId: project.id, title, order: 1 },
    })
    const chapter = await prisma.chapter.create({
      data: { bookId: book.id, title: 'Глава первая', order: 1 },
    })
    await prisma.scene.create({
      data: {
        chapterId: chapter.id,
        title: 'Начало пути',
        status: 'DRAFT',
        order: 1,
        body: cyrillicBody,
      },
    })
    return book
  }

  describe('FB2', () => {
    it('happy path: генерирует валидный XML FictionBook с кириллицей', async () => {
      const book = await makeBook('Хроники Заката')
      const fb2 = await exportBookToFb2(book.id)

      expect(typeof fb2).toBe('string')
      expect(fb2).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(fb2).toContain('<FictionBook')
      expect(fb2).toContain('</FictionBook>')
      expect(fb2).toContain('<book-title>Хроники Заката</book-title>')
      // Текст сцены присутствует
      expect(fb2).toContain('Тёмный лес шумел под ветром')
      // Заголовки секций сбалансированы
      const open = (fb2.match(/<section>/g) || []).length
      const close = (fb2.match(/<\/section>/g) || []).length
      expect(open).toBe(close)
    })

    it('граничная ситуация: несуществующая книга бросает ошибку', async () => {
      await expect(exportBookToFb2('non-existent-id')).rejects.toThrow('Book not found')
    })

    it('граничная ситуация: спецсимволы XML в названии экранируются', async () => {
      const book = await makeBook('Меч & Магия <финал>')
      const fb2 = await exportBookToFb2(book.id)
      expect(fb2).toContain('Меч &amp; Магия &lt;финал&gt;')
      // Сырых неэкранированных символов в названии быть не должно
      expect(fb2).not.toContain('Меч & Магия <финал>')
    })
  })

  describe('PDF', () => {
    it('happy path: генерирует непустой PDF-буфер с сигнатурой %PDF', async () => {
      const book = await makeBook('Книга для PDF')
      const pdf = await exportBookToPdf(book.id)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      // Сигнатура PDF: %PDF
      expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF')
      // Признак корректно завершённого документа
      expect(pdf.subarray(-6).toString('ascii')).toContain('EOF')
    })

    it('граничная ситуация: несуществующая книга бросает ошибку', async () => {
      await expect(exportBookToPdf('non-existent-id')).rejects.toThrow('Book not found')
    })
  })
})
