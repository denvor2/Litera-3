import { useMemo } from 'react'
import './Guide.css'

interface GuideProps {
  content: string
  onBack: () => void
  title?: string
}

export function Guide({ content, onBack, title = 'Справка' }: GuideProps) {
  const htmlContent = useMemo(() => {
    // Простой markdown парсер (для Фазы 0)
    let html = content
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/gm, '<p>')
      .replace(/$/gm, '</p>')
      .replace(/<p><\/p>/g, '')

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
