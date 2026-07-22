import { useState } from 'react'
import { API_BASE } from '../config'
import type { Book } from '../types'
import './ExportButton.css'

interface ExportButtonProps {
  book: Book
}

type ExportFormat = 'docx' | 'fb2' | 'pdf'

export function ExportButton({ book }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true)
    setError(null)
    setShowMenu(false)

    try {
      const url = format === 'docx'
        ? `${API_BASE}/api/books/${book.id}/export`
        : `${API_BASE}/api/books/${book.id}/export?format=${format}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to export book as ${format.toUpperCase()}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${book.title}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
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
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="export-button"
        title="Выбрать формат экспорта"
      >
        {isExporting ? '⟳ Экспортирование...' : '📄 Экспорт'}
      </button>
      {showMenu && !isExporting && (
        <div className="export-menu">
          <button onClick={() => handleExport('docx')} className="export-menu-item">
            .DOCX (Word)
          </button>
          <button onClick={() => handleExport('fb2')} className="export-menu-item">
            .FB2 (Fiction Book)
          </button>
          <button onClick={() => handleExport('pdf')} className="export-menu-item">
            .PDF
          </button>
        </div>
      )}
      {error && <div className="export-error">{error}</div>}
    </div>
  )
}
