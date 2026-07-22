import { useState } from 'react'
import { API_BASE } from '../config'
import type { Book } from '../types'
import './ExportButton.css'

interface ExportButtonProps {
  book: Book
}

export function ExportButton({ book }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/books/${book.id}/export`)

      if (!response.ok) {
        throw new Error('Failed to export book')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${book.title}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="export-button-container">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="export-button"
        title={`Экспортировать "${book.title}" в .docx`}
      >
        {isExporting ? '⟳ Экспортирование...' : '📄 Экспорт в .docx'}
      </button>
      {error && <div className="export-error">{error}</div>}
    </div>
  )
}
