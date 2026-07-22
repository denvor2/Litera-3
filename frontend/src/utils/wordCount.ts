export function countWords(text: string): number {
  if (!text) return 0
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length
}

export function countCharacters(text: string, withSpaces: boolean = true): number {
  if (!text) return 0
  if (withSpaces) return text.length
  return text.replace(/\s/g, '').length
}

// Извлечение текста из TipTap JSON
export function extractTextFromTipTap(content: unknown): string {
  if (!content || typeof content !== 'object') return ''

  const doc = content as any
  if (!doc.content || !Array.isArray(doc.content)) return ''

  function processNode(node: any): string {
    if (!node) return ''

    let nodeText = ''
    if (node.type === 'text') {
      nodeText = node.text || ''
    } else if (node.content && Array.isArray(node.content)) {
      nodeText = node.content.map(processNode).join('')
    }

    return nodeText
  }

  return doc.content.map(processNode).join('\n')
}

// Расчёт авторских листов (1 а.л. = 40 000 знаков с пробелами)
export function countAuthorSheets(charCount: number): number {
  const CHARS_PER_SHEET = 40000
  return charCount / CHARS_PER_SHEET
}

// Расчёт страниц (1 страница = 1800 знаков с пробелами)
export function countPages(charCount: number): number {
  const CHARS_PER_PAGE = 1800
  return charCount / CHARS_PER_PAGE
}
