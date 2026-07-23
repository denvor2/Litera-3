import { useState } from 'react'
import type { CodexEntry } from '../types'
import './CodexCard.css'

interface CodexCardProps {
  entry: CodexEntry
  onSave: (entry: CodexEntry) => void
  onBack: () => void
}

export function CodexCard({ entry, onSave, onBack }: CodexCardProps) {
  const [formData, setFormData] = useState(entry)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="codex-card">
      <div className="card-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>{entry.title}</h2>
      </div>

      <div className="card-content">
        <div className="form-group">
          <label>Название</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Тип</label>
          <select value={entry.type} disabled>
            <option value="character">Персонаж</option>
            <option value="location">Локация</option>
            <option value="artifact">Артефакт</option>
            <option value="organization">Организация</option>
          </select>
        </div>

        {/* TODO: Динамические поля по типу */}

        <div className="form-group">
          <label>Описание</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Детальное описание..."
            rows={8}
          />
        </div>

        <div className="mentions-block">
          <h3>Появляется в сценах</h3>
          {/* TODO: Список сцен где упоминается */}
          <p style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>Загрузка...</p>
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
