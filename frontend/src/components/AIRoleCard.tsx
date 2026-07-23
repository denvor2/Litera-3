import { useState, useEffect } from 'react'
import type { AIRole } from './AIPanel'
import { API_BASE } from '../config'

interface AIRoleCardProps {
  role: AIRole | null
  onClose: () => void
  onSave: (updatedRole: AIRole) => void
}

export function AIRoleCard({ role, onClose, onSave }: AIRoleCardProps) {
  const [formData, setFormData] = useState<AIRole | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPromptInput, setNewPromptInput] = useState('')

  useEffect(() => {
    if (role) {
      setFormData({ ...role })
    }
  }, [role])

  if (!formData) return null

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Имя роли не может быть пустым')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`${API_BASE}/api/ai-roles/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          systemPrompt: formData.systemPrompt || '',
          quickPrompts: formData.quickPrompts || [],
          icon: formData.icon || '🤖',
          model: formData.model || 'claude-3-5-sonnet',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save role')
      }

      const updated = await response.json()
      onSave(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  const addPrompt = () => {
    if (newPromptInput.trim() && formData.quickPrompts.length < 6) {
      setFormData({
        ...formData,
        quickPrompts: [...formData.quickPrompts, newPromptInput.trim()],
      })
      setNewPromptInput('')
    }
  }

  const removePrompt = (idx: number) => {
    setFormData({
      ...formData,
      quickPrompts: formData.quickPrompts.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="center-card">
      <div className="center-back" onClick={onClose}>
        ← Назад
      </div>

      <div className="head">
        <div className="avatar-lg">{formData.icon}</div>
        <div>
          <h2>{formData.type === 'coauthor' ? 'Соавтор' : formData.type === 'editor' ? 'Редактор' : formData.type === 'critic' ? 'Критик' : formData.type === 'reader' ? 'Читатель' : 'Помощник'}</h2>
          <div className="subtitle">{formData.type === 'custom' ? 'Пользовательская роль' : 'Встроенная роль'}</div>
        </div>
      </div>

      {error && (
        <div style={{ color: '#A32D2D', fontSize: '12px', marginBottom: '12px', padding: '8px', background: 'rgba(163,45,45,0.1)', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div className="field">
        <label>Название роли</label>
        <input
          type="text"
          className="bc-input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Соавтор"
        />
      </div>

      <div className="field">
        <label>Системный промпт</label>
        <textarea
          className="bc-textarea"
          value={formData.systemPrompt || ''}
          onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
          placeholder="Инструкция для ассистента. Например: 'Ты опытный редактор, помогаешь улучшить текст…'"
          rows={6}
        />
        <div className="bc-hint">Определяет поведение и стиль ассистента</div>
      </div>

      <div className="field">
        <label>Типовые запросы</label>
        <div style={{ marginBottom: '8px' }}>
          {formData.quickPrompts.map((prompt, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                marginBottom: '4px',
                background: 'var(--surface-2)',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <span>{prompt}</span>
              <button
                onClick={() => removePrompt(idx)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#A32D2D',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <input
            type="text"
            className="bc-input"
            value={newPromptInput}
            onChange={(e) => setNewPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addPrompt()
              }
            }}
            placeholder="Новый типовой запрос…"
            style={{ marginBottom: 0 }}
          />
          <button
            onClick={addPrompt}
            disabled={formData.quickPrompts.length >= 6}
            style={{
              padding: '8px 12px',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--ink-2)',
              cursor: formData.quickPrompts.length >= 6 ? 'not-allowed' : 'pointer',
              opacity: formData.quickPrompts.length >= 6 ? 0.5 : 1,
              fontSize: '12px',
            }}
          >
            + Добавить
          </button>
        </div>
        <div className="bc-hint">Максимум 6 типовых запросов. Введите текст и нажмите Enter или кнопку.</div>
      </div>

      <div className="bc-actions">
        <button onClick={onClose} className="bc-btn" disabled={saving}>
          Отмена
        </button>
        <button onClick={handleSave} className="bc-btn primary" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
