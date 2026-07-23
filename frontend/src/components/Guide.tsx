import { useMemo } from 'react'
import './Guide.css'

interface GuideProps {
  content: string
  onBack: () => void
  title?: string
}

export function Guide({ content, onBack, title = 'Справка' }: GuideProps) {
  const htmlContent = useMemo(() => {
    let html = content

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>')

    // Inline formatting
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/_(.*?)_/g, '<em>$1</em>')
    html = html.replace(/`(.*?)`/g, '<code>$1</code>')

    // Links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

    // Lists - unordered
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>')
    html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*?<\/li>)/s, (match: string) => `<ul>${match}</ul>`)

    // Lists - ordered
    html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>')

    // Paragraphs
    const blocks = html.split(/\n\n+/)
    html = blocks
      .map((block: string) => {
        block = block.trim()
        if (!block) return ''
        if (block.match(/^<[hul]/i)) return block
        if (block.match(/^<li/i)) return `<ol>${block}</ol>`
        return `<p>${block}</p>`
      })
      .filter((b: string) => b)
      .join('')

    // Cleanup
    html = html.replace(/(<ul><li>.*?<\/li><\/ul>)/gs, (match: string) => {
      return match
        .replace(/<\/li><\/ul>\n*<ul><li>/g, '</li><li>')
        .replace(/\n/g, '')
    })

    return html
  }, [content])

  return (
    <div className="guide">
      <div className="card-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>{title}</h2>
      </div>

      <div className="guide-content">
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  )
}
