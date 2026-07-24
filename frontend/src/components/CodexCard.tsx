import { useState, useEffect } from 'react'
import type { CodexEntry } from '../types'
import { API_BASE } from '../config'
import './CodexCard.css'

interface CodexCardProps {
  entry: CodexEntry
  onSave: (entry: CodexEntry) => void
  onBack: () => void
  onSceneClick?: (sceneId: string) => void
}

interface Attributes {
  appearance?: string
  personality?: string
  goal_conflict?: string
  description?: string
}

export function CodexCard({ entry, onSave, onBack, onSceneClick }: CodexCardProps) {
  const attrs = (entry.attributes as Attributes) || {}
  const [formData, setFormData] = useState<CodexEntry>(entry)
  const [mentions, setMentions] = useState<Array<{ sceneId: string; chapterTitle: string; sceneTitle: string }>>([])
  const [mentionsLoading, setMentionsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadMentions = async () => {
      setMentionsLoading(true)
      try {
        const response = await fetch(`${API_BASE}/api/codex-entries/${entry.id}/mentions`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setMentions(data || [])
        }
      } catch (error) {
        console.error('Failed to load mentions:', error)
      } finally {
        setMentionsLoading(false)
      }
    }
    loadMentions()
  }, [entry.id])

  const handleAttrChange = (key: keyof Attributes, value: string) => {
    const updatedAttrs = { ...attrs, [key]: value }
    setFormData({ ...formData, attributes: updatedAttrs })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
      onBack()
    } finally {
      setSaving(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      character: 'персонаж',
      location: 'локация',
      artifact: 'артефакт',
      organization: 'организация',
    }
    return typeMap[type] || type
  }

  const initials = entry.name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')

  return (
    <div className="codex-card">
      <div className="card-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
      </div>

      <div className="card-content">
        <div className="head" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
          <div className="avatar-lg">{initials}</div>
          <div>
            <h2>{entry.name}</h2>
            <div className="subtitle">{getTypeLabel(entry.type)}</div>
          </div>
        </div>

        {entry.type === 'character' && (
          <>
            <div className="form-group">
              <label>Внешность</label>
              <textarea
                value={attrs.appearance || ''}
                onChange={(e) => handleAttrChange('appearance', e.target.value)}
                placeholder="Описание внешности"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Характер</label>
              <textarea
                value={attrs.personality || ''}
                onChange={(e) => handleAttrChange('personality', e.target.value)}
                placeholder="Черты характера и поведение"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Цель / конфликт</label>
              <textarea
                value={attrs.goal_conflict || ''}
                onChange={(e) => handleAttrChange('goal_conflict', e.target.value)}
                placeholder="Цель персонажа и основной конфликт"
                rows={4}
              />
            </div>
          </>
        )}

        {entry.type === 'location' && (
          <div className="form-group">
            <label>Описание</label>
            <textarea
              value={attrs.description || ''}
              onChange={(e) => handleAttrChange('description', e.target.value)}
              placeholder="Описание локации"
              rows={6}
            />
          </div>
        )}

        {(entry.type === 'artifact' || entry.type === 'organization') && (
          <div className="form-group">
            <label>Описание</label>
            <textarea
              value={attrs.description || ''}
              onChange={(e) => handleAttrChange('description', e.target.value)}
              placeholder="Описание"
              rows={6}
            />
          </div>
        )}

        <div className="mentions-block">
          <h3>Появляется в сценах</h3>
          {mentionsLoading ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>Загрузка...</p>
          ) : mentions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {mentions.map((mention) => (
                <span
                  key={mention.sceneId}
                  className="scene-link"
                  onClick={() => onSceneClick?.(mention.sceneId)}
                >
                  {mention.chapterTitle} — {mention.sceneTitle}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>Не упоминается в сценах</p>
          )}
        </div>

        <div className="card-actions">
          <button className="btn-secondary" onClick={onBack} disabled={saving}>
            Отмена
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
