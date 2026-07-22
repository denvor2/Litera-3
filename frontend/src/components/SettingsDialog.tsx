import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import './SettingsDialog.css'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { theme, toggleTheme } = useTheme()
  const [sidebarWidth, setSidebarWidth] = useState(280)

  if (!isOpen) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Настройки</h2>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Оформление</h3>

            <div className="setting-item">
              <label htmlFor="theme">Тема</label>
              <div className="theme-selector">
                <button
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={toggleTheme}
                >
                  ☀️ Светлая
                </button>
                <button
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={toggleTheme}
                >
                  🌙 Тёмная
                </button>
              </div>
            </div>

            <div className="setting-item">
              <label htmlFor="sidebar-width">Ширина боковой панели</label>
              <div className="slider-container">
                <input
                  id="sidebar-width"
                  type="range"
                  min="200"
                  max="400"
                  value={sidebarWidth}
                  onChange={e => setSidebarWidth(parseInt(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{sidebarWidth}px</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Информация</h3>
            <div className="settings-info">
              <p>
                <strong>LitStudio 2</strong>
              </p>
              <p>Версия: 1.0.0 (MVP)</p>
              <p>Фаза: 0 - MVP</p>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-close-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
