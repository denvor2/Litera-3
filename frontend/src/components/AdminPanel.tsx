import './AdminPanel.css'

interface AdminPanelProps {
  onClose: () => void
  onLogout: () => void
}

export function AdminPanel({ onClose, onLogout }: AdminPanelProps) {
  return (
    <div className="admin-panel">
      <div className="admin-modal">
        <div className="admin-header">
          <h2>Админ-панель</h2>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        <div className="admin-content">
          <p>Админ-панель разработана для управления системой</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Дополнительные функции будут добавлены в будущих версиях</p>
        </div>
        <div className="admin-footer">
          <button className="btn-primary" onClick={onClose}>Закрыть</button>
          <button className="btn-secondary" onClick={onLogout}>Выход</button>
        </div>
      </div>
    </div>
  )
}
