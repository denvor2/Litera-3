import { useState, useEffect } from 'react'
import type { Scene } from '../types'
import './VersionHistory.css'

interface Version {
  id: string
  entityType: string
  entityId: string
  snapshot: unknown
  createdAt: string
}

interface VersionHistoryProps {
  scene: Scene
  onRestore?: (version: Version) => void
}

export function VersionHistory({ scene, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return

    const loadVersions = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/scenes/${scene.id}/versions`)
        const data = await response.json()
        setVersions(data)
      } catch (error) {
        console.error('Failed to load versions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVersions()
  }, [scene.id, expanded])

  const handleRestore = async (version: Version) => {
    if (!window.confirm('Восстановить эту версию? Текущий текст будет перемещен в историю.')) {
      return
    }

    try {
      await fetch('/api/versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: version.id, sceneId: scene.id }),
      })

      onRestore?.(version)
    } catch (error) {
      console.error('Failed to restore version:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="version-history">
      <button
        className="version-history-toggle"
        onClick={() => setExpanded(!expanded)}
        title="История версий сцены"
      >
        {expanded ? '▼' : '▶'} 📜 История ({versions.length})
      </button>

      {expanded && (
        <div className="version-history-content">
          {loading && <div className="version-loading">Загрузка...</div>}

          {!loading && versions.length === 0 && (
            <div className="version-empty">Нет сохраненных версий</div>
          )}

          {!loading && versions.length > 0 && (
            <div className="version-list">
              {versions.map((version, index) => (
                <div key={version.id} className="version-item">
                  <div className="version-header">
                    <span className="version-date">{formatDate(version.createdAt)}</span>
                    <span className="version-number">v{versions.length - index}</span>
                  </div>
                  <button
                    className="version-restore-btn"
                    onClick={() => handleRestore(version)}
                  >
                    ↶ Восстановить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
