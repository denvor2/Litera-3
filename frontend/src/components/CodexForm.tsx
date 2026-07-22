import { useState } from 'react'
import { API_BASE } from '../config'
import type { CodexEntry } from '../types'
import './CodexForm.css'

interface CodexFormProps {
  projectId: string
  type: 'character' | 'location'
  initialEntry?: CodexEntry
  onSave: (entry: CodexEntry) => void
  onCancel: () => void
}

export function CodexForm({
  projectId,
  type,
  initialEntry,
  onSave,
  onCancel,
}: CodexFormProps) {
  const [formData, setFormData] = useState({
    name: initialEntry?.name || '',
    appearance: (initialEntry?.attributes as Record<string, string>)?.appearance || '',
    personality: (initialEntry?.attributes as Record<string, string>)?.personality || '',
    goal_conflict: (initialEntry?.attributes as Record<string, string>)?.goal_conflict || '',
    description: (initialEntry?.attributes as Record<string, string>)?.description || '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const attributes =
        type === 'character'
          ? {
              appearance: formData.appearance,
              personality: formData.personality,
              goal_conflict: formData.goal_conflict,
            }
          : {
              description: formData.description,
            }

      const entry: CodexEntry = {
        id: initialEntry?.id || crypto.randomUUID(),
        projectId,
        type,
        name: formData.name,
        attributes,
        createdAt: initialEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (initialEntry) {
        // Update
        await fetch(`${API_BASE}/api/codex/${initialEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, attributes }),
        })
      } else {
        // Create
        await fetch(`${API_BASE}/api/codex`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, type, name: formData.name, attributes }),
        })
      }

      onSave(entry)
    } catch (error) {
      console.error('Failed to save codex entry:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const title = initialEntry ? 'Редактировать' : 'Создать'
  const typeLabel = type === 'character' ? 'персонажа' : 'локацию'

  return (
    <form className="codex-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h3>
          {title} {typeLabel}
        </h3>
      </div>

      <div className="form-group">
        <label htmlFor="name">Имя *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          required
          placeholder="Введите имя"
        />
      </div>

      {type === 'character' && (
        <>
          <div className="form-group">
            <label htmlFor="appearance">Внешность</label>
            <textarea
              id="appearance"
              value={formData.appearance}
              onChange={e => handleChange('appearance', e.target.value)}
              placeholder="Описание внешности"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="personality">Характер</label>
            <textarea
              id="personality"
              value={formData.personality}
              onChange={e => handleChange('personality', e.target.value)}
              placeholder="Описание характера"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal_conflict">Цель/конфликт</label>
            <textarea
              id="goal_conflict"
              value={formData.goal_conflict}
              onChange={e => handleChange('goal_conflict', e.target.value)}
              placeholder="Главная цель или конфликт"
              rows={3}
            />
          </div>
        </>
      )}

      {type === 'location' && (
        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Описание локации"
            rows={5}
          />
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={isLoading}>
          Отменить
        </button>
        <button type="submit" className="btn-submit" disabled={isLoading || !formData.name}>
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}
