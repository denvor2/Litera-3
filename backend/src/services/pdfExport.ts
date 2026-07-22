import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'
import { extractTextFromTipTap, type TipTapNode } from '../utils/tiptap.js'

const prisma = new PrismaClient()

export async function exportBookToPdf(bookId: string): Promise<Buffer> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        where: { deletedAt: null },
        include: {
          scenes: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!book) {
    throw new Error('Book not found')
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
  })

  let fontRegistered = false
  try {
    doc.registerFont('Body', 'C:\\Windows\\Fonts\\arial.ttf')
    doc.registerFont('BodyBold', 'C:\\Windows\\Fonts\\arialbd.ttf')
    fontRegistered = true
  } catch {
    try {
      doc.registerFont('Body', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
      doc.registerFont('BodyBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
      fontRegistered = true
    } catch {
    }
  }

  const bodyFont = fontRegistered ? 'BodyBold' : 'Helvetica-Bold'
  const defaultFont = fontRegistered ? 'Body' : 'Helvetica'

  // Collect output
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', resolve)
    doc.on('error', reject)

    // Title
    doc.fontSize(24).font(bodyFont).text(book.title, { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(11).font(defaultFont).text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, { align: 'center' })
    doc.moveDown(1)

    // Chapters and scenes
    for (const chapter of book.chapters) {
      // Chapter heading
      doc.fontSize(16).font(bodyFont).text(chapter.title)
      doc.moveDown(0.3)
      doc.fontSize(11).font(defaultFont)

      // Scenes
      for (const scene of chapter.scenes) {
        if (scene.status === 'DRAFT' || scene.status === 'EDITING') {
          // Scene title
          doc.fontSize(13).font(bodyFont).text(scene.title)
          doc.moveDown(0.2)

          // Scene content
          const text = extractTextFromTipTap(scene.body as any)
          doc.fontSize(11).font(defaultFont).text(text, {
            align: 'justify',
            continued: false,
          })
          doc.moveDown(0.5)
        }
      }

      doc.moveDown(0.3)
    }

    // Add page numbers
    const pages = doc.bufferedPageRange().count
    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i)
      doc.fontSize(10)
        .text(
          `${i + 1}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        )
    }

    doc.end()
  })

  return Buffer.concat(chunks)
}
