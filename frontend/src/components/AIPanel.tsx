import { useState, useRef, useEffect } from 'react'
import './AIPanel.css'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface AIRole {
  id: string
  name: string
  type: string
  icon: string
  quickPrompts: string[]
}

export type AIScope = 'scene' | 'chapter' | 'dialogue' | 'selection' | 'idea' | 'codex-element' | 'field'

export interface AIPanelProps {
  activeRole: AIRole | null
  aiRoles: AIRole[]
  onSelectRole: (role: AIRole) => void
  onOpenRoleSettings: (role: AIRole) => void
  scope: AIScope
  onScopeChange: (scope: AIScope) => void
  messages: AIMessage[]
  onSendMessage: (message: string) => void
  onSendQuickPrompt: (prompt: string) => void
  selectedText?: string
  contextInfo?: string
  isLoading?: boolean
  error?: string
  onAddCustomRole?: () => void
}

export function AIPanel({
  activeRole,
  aiRoles,
  onSelectRole,
  onOpenRoleSettings,
  scope,
  onScopeChange,
  messages,
  onSendMessage,
  onSendQuickPrompt,
  selectedText,
  contextInfo = 'текст этой книги + Кодекс всей серии',
  isLoading = false,
  error,
  onAddCustomRole,
}: AIPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Sort roles to match mockup order: Соавтор, Редактор, Критик, Читатель
  const roleOrder = { 'coauthor': 0, 'editor': 1, 'critic': 2, 'reader': 3, 'custom': 4 }
  const sortedRoles = [...aiRoles].sort((a, b) =>
    (roleOrder[a.type as keyof typeof roleOrder] ?? 5) - (roleOrder[b.type as keyof typeof roleOrder] ?? 5)
  )

  return (
    <div className="ws-right">
      {/* Заголовок (маленький, uppercase, как в мокапе) */}
      <div className="ws-right-head">
        <h3>AI-помощники</h3>
      </div>

      {/* Контекст (мелкая строка без фона) */}
      <div className="ai-context-note">
        Контекст: {contextInfo}
      </div>

      {/* Роли (чипы в одну линию с переносом) */}
      <div className="ai-chips">
        {sortedRoles.map((role) => (
          <div
            key={role.id}
            className={`ai-chip ${activeRole?.id === role.id ? 'active' : ''}`}
            onClick={() => onSelectRole(role)}
            title={role.name}
          >
            <span>{role.name}</span>
            <button
              className="ai-gear"
              onClick={(e) => {
                e.stopPropagation()
                onOpenRoleSettings(role)
              }}
              title="Настройки"
            >
              ⚙
            </button>
          </div>
        ))}
        <div className="ai-chip add" onClick={onAddCustomRole} title="Добавить помощника">
          + свой
        </div>
      </div>

      {/* Масштаб запроса */}
      <div className="ai-scope-row">
        {(['scene', 'chapter', 'dialogue', 'selection'] as const).map((s) => (
          <button
            key={s}
            className={`scope-chip ${scope === s ? 'active' : ''}`}
            onClick={() => onScopeChange(s)}
          >
            {{
              scene: 'Сцена',
              chapter: 'Глава',
              dialogue: 'Диалог',
              selection: 'Выделение',
            }[s]}
          </button>
        ))}
      </div>

      {/* Выделение (если есть) */}
      {selectedText && scope === 'selection' && (
        <div className="ai-scope-hint">
          «{selectedText.substring(0, 50)}{selectedText.length > 50 ? '…' : ''}»
        </div>
      )}

      {/* Типовые запросы */}
      {activeRole && (
        <div className="ai-quick">
          <div className="ai-quick-label">Типовые запросы:</div>
          {activeRole.quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              className="quick-btn"
              onClick={() => onSendQuickPrompt(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="ai-error">
          <strong>⚠️</strong> {error}
        </div>
      )}

      {/* Диалог */}
      <div className="ai-chat">
        {messages.length === 0 && !error ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12px', padding: '20px' }}>
            Начните диалог или используйте типовые запросы…
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="ai-msg">
              <div className="who">{msg.role === 'user' ? 'Вы' : activeRole?.name || 'Помощник'}</div>
              <div>{msg.content}</div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="ai-msg">
            <div className="who">Помощник</div>
            <div>⟳ Думаю…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма ввода (внизу, прижата к краю) */}
      <div className="ai-input-row">
        <input
          type="text"
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Спроси помощника…"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{ padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}
        >
          {isLoading ? '⟳' : '📤'}
        </button>
      </div>
    </div>
  )
}
