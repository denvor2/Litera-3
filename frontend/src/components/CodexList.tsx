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
      {entries.map(entry => (
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

          {type === 'character' && entry.attributes ? (
            <>
              {(entry.attributes as Record<string, any>).appearance && (
                <div className="codex-field">
                  <label>Внешность:</label>
                  <p>{(entry.attributes as Record<string, string>).appearance}</p>
                </div>
              )}
              {(entry.attributes as Record<string, string>).personality && (
                <div className="codex-field">
                  <label>Характер:</label>
                  <p>{(entry.attributes as Record<string, string>).personality}</p>
                </div>
              )}
              {(entry.attributes as Record<string, string>).goal_conflict && (
                <div className="codex-field">
                  <label>Цель/конфликт:</label>
                  <p>{(entry.attributes as Record<string, string>).goal_conflict}</p>
                </div>
              )}
            </>
          ) : null}

          {type === 'location' && entry.attributes ? (
            <>
              {(entry.attributes as Record<string, any>).description && (
                <div className="codex-field">
                  <label>Описание:</label>
                  <p>{(entry.attributes as Record<string, any>).description}</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      ))}
    </div>
  )
}
