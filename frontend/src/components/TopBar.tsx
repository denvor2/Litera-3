import { useState } from 'react'
import './TopBar.css'

interface TopBarProps {
  onZenToggle: () => void
}

export function TopBar({ onZenToggle }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Меню"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="hmenu">
            <div className="hmenu-item">📥 Импорт</div>
            <div className="hmenu-item">📤 Экспорт</div>
            <div className="hmenu-sep"></div>
            <div className="hmenu-item">📚 История версий</div>
            <div className="hmenu-sep"></div>
            <div className="hmenu-item">❓ Руководство</div>
            <div className="hmenu-item">⚙️ Настройки</div>
          </div>
        )}

        <h1 className="topbar-title">LitStudio 2</h1>
      </div>

      <button className="zen-toggle" onClick={onZenToggle} title="Полноэкранный режим">
        ⛓️ Режим письма
      </button>
    </div>
  )
}
