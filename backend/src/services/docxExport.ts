import { Document, Packer, Paragraph, HeadingLevel, convertInchesToTwip, TextRun } from 'docx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TipTapNode {
  type: string
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
  level?: number
}

function extractTextFromTipTap(node: TipTapNode | TipTapNode[] | undefined): string {
  if (!node) return ''

  if (Array.isArray(node)) {
    return node.map(n => extractTextFromTipTap(n)).join('')
  }

  if (node.type === 'text') {
    return node.text || ''
  }

  if (node.type === 'doc' || node.type === 'paragraph' || node.type === 'bullet_list' || node.type === 'ordered_list') {
    return extractTextFromTipTap(node.content)
  }

  if (node.type === 'list_item' || node.type === 'blockquote' || node.type === 'heading') {
    return extractTextFromTipTap(node.content)
  }

  return ''
}

function convertTipTapToDocxParagraphs(body: unknown): Paragraph[] {
  const doc = body as TipTapNode | undefined
  if (!doc || !doc.content) {
    return [new Paragraph({ text: '' })]
  }

  const paragraphs: Paragraph[] = []

  for (const node of doc.content as TipTapNode[]) {
    if (node.type === 'paragraph') {
      const text = extractTextFromTipTap(node)
      if (text.trim()) {
        paragraphs.push(
          new Paragraph({
            text: text,
            spacing: { line: 480 }, // 1.5 line spacing
          })
        )
      } else {
        paragraphs.push(new Paragraph({ text: '' }))
      }
    }

    if (node.type === 'heading') {
      const text = extractTextFromTipTap(node)
      const level = node.level || 1
      paragraphs.push(
        new Paragraph({
          text: text,
          heading: (HeadingLevel as Record<number, unknown>)[`HEADING_${level}`] || HeadingLevel.HEADING_1,
          spacing: { after: 240 },
        })
      )
    }

    if (node.type === 'bullet_list' || node.type === 'ordered_list') {
      const items = node.content as TipTapNode[] | undefined
      if (items) {
        for (const item of items) {
          const itemText = extractTextFromTipTap(item)
          paragraphs.push(
            new Paragraph({
              text: itemText,
              bullet: { level: 0 },
            })
          )
        }
      }
    }
  }

  return paragraphs
}

export async function exportBookToDocx(bookId: string): Promise<Buffer> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        include: {
          scenes: {
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

  const sections = []

  // Title
  sections.push(
    new Paragraph({
      text: book.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 480 },
    })
  )

  // Chapters and scenes
  for (const chapter of book.chapters) {
    // Chapter heading
    sections.push(
      new Paragraph({
        text: chapter.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240, before: 240 },
      })
    )

    // Scenes
    for (const scene of chapter.scenes) {
      // Only include draft and editing, not done
      if (scene.status === 'DRAFT' || scene.status === 'EDITING') {
        const sceneContent = convertTipTapToDocxParagraphs(scene.body)
        sections.push(...sceneContent)

        // Empty line between scenes (except for last scene)
        if (scene.id !== chapter.scenes[chapter.scenes.length - 1]?.id) {
          sections.push(new Paragraph({ text: '' }))
        }
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  })

  return await Packer.toBuffer(doc)
}
