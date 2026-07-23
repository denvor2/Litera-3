import { useState } from 'react'
import type { Project } from '../types'
import './ProjectCard.css'

interface ProjectCardProps {
  project: Project
  onSave: (project: Project) => void
  onBack: () => void
}

export function ProjectCard({ project, onSave, onBack }: ProjectCardProps) {
  const [formData, setFormData] = useState(project)
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
    <div className="project-card">
      <div className="card-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>{project.title}</h2>
      </div>

      <div className="card-content">
        <div className="form-group">
          <label>Название проекта</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="О чём этот проект, основная идея..."
            rows={10}
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
            Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}
          </label>
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
