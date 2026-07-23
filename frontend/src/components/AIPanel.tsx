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
  tokensUsed?: number
  tokenLimit?: number
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
  contextInfo = 'текст этой сцены + Кодекс серии',
  isLoading = false,
  tokensUsed = 0,
  tokenLimit = 8000,
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

  const tokensPercent = Math.round((tokensUsed / tokenLimit) * 100)
  const warningLevel = tokensPercent > 90 ? 'critical' : tokensPercent > 80 ? 'warning' : 'ok'

  return (
    <div className="ai-panel">
      {/* Заголовок */}
      <div className="ws-right-head">
        <h3>⚡ AI-помощники</h3>
        <div className="ai-context-note">
          Контекст: {contextInfo}
        </div>
      </div>

      {/* Роли */}
      <div className="ai-chips">
        {aiRoles.map((role) => (
          <div key={role.id} className="ai-chip-wrapper">
            <button
              className={`ai-chip ${activeRole?.id === role.id ? 'active' : ''}`}
              onClick={() => onSelectRole(role)}
              title={role.name}
            >
              <span className="ai-chip-icon">{role.icon}</span>
              <span className="ai-chip-name">{role.name}</span>
            </button>
            <button
              className="ai-gear"
              onClick={() => onOpenRoleSettings(role)}
              title="Настройки"
            >
              ⚙
            </button>
          </div>
        ))}
        <button
          className="ai-chip ai-chip add"
          onClick={onAddCustomRole}
          title="Добавить помощника"
        >
          <span>+</span> свой
        </button>
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
          <div className="ai-quick-label">Быстрые запросы:</div>
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
          <strong>⚠️ Ошибка:</strong> {error}
        </div>
      )}

      {/* Диалог */}
      <div className="ai-chat">
        {messages.length === 0 && !error ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '20px' }}>
            Начните диалог или используйте быстрые запросы…
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

      {/* Индикатор токенов */}
      {tokenLimit > 0 && (
        <div className={`ai-tokens ${warningLevel}`}>
          Контекст: {tokensUsed} / {tokenLimit} токенов ({tokensPercent}%)
        </div>
      )}

      {/* Форма ввода */}
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
