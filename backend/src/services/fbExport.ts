import { PrismaClient } from '@prisma/client'
import { extractTextFromTipTap, escapeXml, type TipTapNode } from '../utils/tiptap.js'

const prisma = new PrismaClient()

function convertTipTapToFb2Xml(body: unknown): string {
  const doc = body as TipTapNode | undefined
  if (!doc || !doc.content) {
    return ''
  }

  let xml = ''

  for (const node of doc.content as TipTapNode[]) {
    if (node.type === 'paragraph') {
      const text = extractTextFromTipTap(node)
      if (text.trim()) {
        xml += `<p>${escapeXml(text)}</p>\n`
      }
    }

    if (node.type === 'heading') {
      const text = extractTextFromTipTap(node)
      xml += `<subtitle>${escapeXml(text)}</subtitle>\n`
    }

    if (node.type === 'bullet_list' || node.type === 'ordered_list') {
      const items = node.content as TipTapNode[] | undefined
      if (items) {
        for (const item of items) {
          const itemText = extractTextFromTipTap(item)
          xml += `<p>${escapeXml(itemText)}</p>\n`
        }
      }
    }
  }

  return xml
}

export async function exportBookToFb2(bookId: string): Promise<string> {
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
      project: true,
    },
  })

  if (!book) {
    throw new Error('Book not found')
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <genre>fiction</genre>
      <book-title>${escapeXml(book.title)}</book-title>
      <date>${new Date().toISOString().split('T')[0]}</date>
      <lang>ru</lang>
    </title-info>
    <publish-info>
      <book-name>${escapeXml(book.title)}</book-name>
      <year>${new Date().getFullYear()}</year>
    </publish-info>
    <document-info>
      <author>
        <nickname>LitStudio</nickname>
      </author>
      <date>${new Date().toISOString().split('T')[0]}</date>
      <version>1.0</version>
    </document-info>
  </description>
  <body>
    <section>
      <title><p>${escapeXml(book.title)}</p></title>\n`

  // Add chapters and scenes
  for (const chapter of book.chapters) {
    xml += `      <section>\n`
    xml += `        <title><p>${escapeXml(chapter.title)}</p></title>\n`

    for (const scene of chapter.scenes) {
      if (scene.status === 'DRAFT' || scene.status === 'EDITING') {
        const sceneContent = convertTipTapToFb2Xml(scene.body as any)
        if (sceneContent.trim()) {
          xml += `        <section>\n`
          xml += `          <title><p>${escapeXml(scene.title)}</p></title>\n`
          xml += sceneContent.split('\n').map(line => line ? `          ${line}` : '').join('\n')
          xml += `        </section>\n`
        }
      }
    }

    xml += `      </section>\n`
  }

  xml += `    </section>
  </body>
</FictionBook>`

  return xml
}
