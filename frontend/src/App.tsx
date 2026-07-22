import { useState, useEffect } from 'react'
import './App.css'
import { ManuscriptEditor } from './components/ManuscriptEditor'
import { Sidebar } from './components/Sidebar'
import type { Project, Scene } from './types'

export function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [rightWidth, setRightWidth] = useState(280)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const initProject = async () => {
      try {
        const apiUrl = 'http://localhost:3000/api/projects'
        const response = await fetch(apiUrl)
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
        const text = await response.text()
        if (!text) throw new Error('Empty response')
        const projects = JSON.parse(text)
        if (projects.length > 0) {
          setProject(projects[0])
        } else {
          throw new Error('No projects found')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    initProject()
  }, [])

  if (loading) return <div className="app-loading">Загрузка...</div>
  if (error) return <div className="app-error"><h2>Ошибка</h2><p>{error}</p></div>
  if (!project) return <div className="app-error">Проект не найден</div>

  return (
    <div className={`app ${zenMode ? 'zen-mode' : ''}`}>
      {/* TopBar */}
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
        <button className="zen-toggle" onClick={() => setZenMode(!zenMode)}>
          ⛓️ Режим письма
        </button>
      </div>

      {/* Workspace */}
      <div className="workspace" style={{ '--right-w': `${rightWidth}px` } as any}>
        {/* Sidebar */}
        {!zenMode && (
          <Sidebar
            books={project.books}
            onSceneSelect={() => {}}
            onCreateScene={() => {}}
          />
        )}

        {/* Center */}
        <div className="center">
          <ManuscriptEditor project={project} />
        </div>

        {/* Right Panel */}
        {!zenMode && (
          <>
            <div
              className="resize-handle"
              onMouseDown={(e) => {
                const startX = e.clientX
                const startWidth = rightWidth
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const delta = moveEvent.clientX - startX
                  const newWidth = Math.max(200, Math.min(460, startWidth - delta))
                  setRightWidth(newWidth)
                }
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }
                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            />
            <div className="right-panel">
              <div style={{ padding: '14px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                🤖 AI-помощники (Фаза 2)
              </div>
            </div>
          </>
        )}
      </div>

      {/* BottomBar */}
      <div className="bottombar">
        <div className="stats-group">
          <span>0 слов</span>
          <span>0 знаков</span>
        </div>
        <div className="save-state">
          <span className="save-dot" style={{ backgroundColor: 'var(--done)' }}></span>
          <span>Сохранено</span>
        </div>
      </div>
    </div>
  )
}

export default App
