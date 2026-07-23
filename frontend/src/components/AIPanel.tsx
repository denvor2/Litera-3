import { useState, useRef, useEffect } from 'react'
import './AIPanel.css'

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIRole {
  id: string
  name: string
  description: string
}

interface AIPanelProps {
  activeRole: string
  onSelectRole: (roleId: string) => void
  scope: 'scene' | 'chapter' | 'dialog' | 'selection'
  onScopeChange: (scope: 'scene' | 'chapter' | 'dialog' | 'selection') => void
  messages: AIMessage[]
  onSendMessage: (message: string) => void
  selectedText?: string
  contextInfo?: string
}

const DEFAULT_ROLES: AIRole[] = [
  { id: 'coauthor', name: 'Соавтор', description: 'Помогает писать' },
  { id: 'editor', name: 'Редактор', description: 'Улучшает текст' },
  { id: 'critic', name: 'Критик', description: 'Находит проблемы' },
  { id: 'reader', name: 'Читатель', description: 'Дает обратную связь' },
]

export function AIPanel({
  activeRole,
  onSelectRole,
  scope,
  onScopeChange,
  messages,
  onSendMessage,
  selectedText,
  contextInfo = 'текст этой сцены + Кодекс серии',
}: AIPanelProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
      setIsLoading(true)
      // TODO: Получить ответ от backend
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="ai-panel">
      {/* Роли */}
      <div className="ai-section ai-roles">
        <div className="ai-roles-list">
          {DEFAULT_ROLES.map(role => (
            <button
              key={role.id}
              className={`ai-role-chip ${activeRole === role.id ? 'active' : ''}`}
              onClick={() => onSelectRole(role.id)}
              title={role.description}
            >
              <span className="ai-role-name">{role.name}</span>
              <button
                className="ai-role-settings"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: открыть форму настроек в центре
                }}
                title="Настройки"
              >
                ⚙
              </button>
            </button>
          ))}
        </div>
        <div className="ai-add-role">
          <button className="ai-add-link" onClick={() => {
            // TODO: открыть форму нового помощника в центре
          }}>
            + свой
          </button>
        </div>
      </div>

      {/* Масштаб */}
      <div className="ai-section ai-scope">
        <div className="ai-scope-row">
          {(['scene', 'chapter', 'dialog', 'selection'] as const).map(s => (
            <button
              key={s}
              className={`ai-scope-btn ${scope === s ? 'active' : ''}`}
              onClick={() => onScopeChange(s)}
            >
              {{
                scene: 'Сцена',
                chapter: 'Глава',
                dialog: 'Диалог',
                selection: 'Выделение',
              }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Выделение (если есть) */}
      {selectedText && scope === 'selection' && (
        <div className="ai-section ai-selection">
          <div className="ai-selection-label">Выделено:</div>
          <div className="ai-selection-text">{selectedText}</div>
        </div>
      )}

      {/* Контекст */}
      <div className="ai-context-note">
        <small>Контекст: {contextInfo}</small>
      </div>

      {/* Диалог */}
      <div className="ai-section ai-messages">
        {messages.length === 0 ? (
          <div className="ai-empty">Начните диалог...</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`ai-message ai-message-${msg.role}`}>
              <div className="ai-message-content">{msg.content}</div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="ai-message ai-message-assistant">
            <div className="ai-message-content">⟳ Думаю...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Ввод */}
      <div className="ai-section ai-input-section">
        <textarea
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Спроси ${DEFAULT_ROLES.find(r => r.id === activeRole)?.name || 'помощника'}...`}
          rows={2}
          disabled={isLoading}
        />
        <button
          className="ai-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          title="Отправить (Shift+Enter для новой строки)"
        >
          {isLoading ? '⟳' : '→'}
        </button>
      </div>
    </div>
  )
}
