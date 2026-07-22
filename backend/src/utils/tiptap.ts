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

  if (node.type === 'doc' || node.type === 'paragraph' || node.type === 'bullet_list' || node.type === 'ordered_list') {
    return extractTextFromTipTap(node.content)
  }

  if (node.type === 'list_item' || node.type === 'blockquote' || node.type === 'heading') {
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
