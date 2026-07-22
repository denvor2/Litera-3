export interface TipTapNode {
  type: string
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
  level?: number
}

export function extractTextFromTipTap(node: TipTapNode | TipTapNode[] | undefined): string {
  if (!node) return ''

  if (Array.isArray(node)) {
    return node.map(n => extractTextFromTipTap(n)).join('')
  }

  if (node.type === 'text') {
    return node.text || ''
  }

  // Контейнерные ноды: рекурсивно обходим содержимое.
  // TipTap StarterKit использует camelCase (bulletList/orderedList/listItem),
  // поддерживаем и snake_case на случай legacy-данных.
  const containerTypes = new Set([
    'doc',
    'paragraph',
    'heading',
    'blockquote',
    'bulletList',
    'orderedList',
    'listItem',
    'bullet_list',
    'ordered_list',
    'list_item',
  ])

  if (containerTypes.has(node.type)) {
    return extractTextFromTipTap(node.content)
  }

  return ''
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
