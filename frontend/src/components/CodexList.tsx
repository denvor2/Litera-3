import type { CodexEntry } from '../types'
import './CodexList.css'

interface CodexListProps {
  entries: CodexEntry[]
  type: 'character' | 'location'
  onEdit: (entry: CodexEntry) => void
  onDelete?: (entryId: string) => void
}

export function CodexList({ entries, type, onEdit, onDelete }: CodexListProps) {
  if (entries.length === 0) {
    return (
      <div className="codex-empty">
        <p>Нет {type === 'character' ? 'персонажей' : 'локаций'}</p>
      </div>
    )
  }

  return (
    <div className="codex-list">
      {entries.map(entry => {
        const attrs = (entry.attributes || {}) as Record<string, string>
        return (
          <div key={entry.id} className="codex-item">
            <div className="codex-item-header">
              <h3>{entry.name}</h3>
              <div className="codex-item-actions">
                <button
                  className="btn-icon edit"
                  onClick={() => onEdit(entry)}
                  title="Редактировать"
                >
                  ✎
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => onDelete?.(entry.id)}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </div>

            {type === 'character' && (
              <>
                {attrs.appearance && (
                  <div className="codex-field">
                    <label>Внешность:</label>
                    <p>{attrs.appearance}</p>
                  </div>
                )}
                {attrs.personality && (
                  <div className="codex-field">
                    <label>Характер:</label>
                    <p>{attrs.personality}</p>
                  </div>
                )}
                {attrs.goal_conflict && (
                  <div className="codex-field">
                    <label>Цель/конфликт:</label>
                    <p>{attrs.goal_conflict}</p>
                  </div>
                )}
              </>
            )}

            {type === 'location' && (
              <>
                {attrs.description && (
                  <div className="codex-field">
                    <label>Описание:</label>
                    <p>{attrs.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
