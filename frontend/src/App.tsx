import { useState, useEffect } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { SceneEditor } from './components/SceneEditor'
import { extractTextFromTipTap, countCharacters, countAuthorSheets, countPages } from './utils/wordCount'
import type { Project, Scene } from './types'

export function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
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
          const proj = projects[0]
          setProject(proj)
          // Auto-select first scene
          if (proj.books?.[0]?.chapters?.[0]?.scenes?.[0]) {
            setSelectedScene(proj.books[0].chapters[0].scenes[0])
          }
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

  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene)
  }

  const handleSceneSave = async (updatedScene: Scene) => {
    if (!project) return
    try {
      await fetch(`http://localhost:3000/api/scenes/${updatedScene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedScene),
      })
      setSelectedScene(updatedScene)
      // Update in project tree
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter => ({
            ...chapter,
            scenes: chapter.scenes.map(scene =>
              scene.id === updatedScene.id ? updatedScene : scene
            ),
          })),
        })),
      })
    } catch (error) {
      console.error('Failed to save scene:', error)
    }
  }

  const handleCreateScene = async (chapterId: string) => {
    if (!project) return
    try {
      const response = await fetch('http://localhost:3000/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          title: 'Новая сцена',
          status: 'draft',
          body: '',
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const newScene: Scene = await response.json()

      setSelectedScene(newScene)
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter =>
            chapter.id === chapterId
              ? { ...chapter, scenes: [...chapter.scenes, newScene] }
              : chapter
          ),
        })),
      })
    } catch (error) {
      console.error('Failed to create scene:', error)
    }
  }

  const handleUpdateSceneOrder = async (sceneId: string, newChapterId: string, newOrder: number) => {
    if (!project) return
    try {
      await fetch('http://localhost:3000/api/scenes/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ id: sceneId, chapterId: newChapterId, order: newOrder }],
        }),
      })

      let movedScene: Scene | null = null
      const newProject = {
        ...project,
        books: project.books
          .map(book => ({
            ...book,
            chapters: book.chapters.map(chapter => ({
              ...chapter,
              scenes: chapter.scenes.filter(scene => {
                if (scene.id === sceneId) {
                  movedScene = { ...scene, chapterId: newChapterId, order: newOrder }
                  return false
                }
                return true
              }),
            })),
          }))
          .map(book => ({
            ...book,
            chapters: book.chapters.map(chapter =>
              chapter.id === newChapterId && movedScene
                ? { ...chapter, scenes: [...chapter.scenes, movedScene] }
                : chapter
            ),
          })),
      }
      setProject(newProject)
    } catch (error) {
      console.error('Failed to update scene order:', error)
    }
  }

  if (loading) return <div className="app-loading">Загрузка...</div>
  if (error) return <div className="app-error"><h2>Ошибка</h2><p>{error}</p></div>
  if (!project) return <div className="app-error">Проект не найден</div>

  const wordCount = selectedScene?.wordCount ?? 0
  const sceneText = selectedScene ? extractTextFromTipTap(selectedScene.body) : ''
  const charCount = countCharacters(sceneText, true)
  const authorSheets = countAuthorSheets(charCount).toFixed(2)
  const pages = countPages(charCount).toFixed(0)

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
            project={project}
            books={project.books}
            selectedSceneId={selectedScene?.id}
            onSceneSelect={handleSceneSelect}
            onCreateScene={handleCreateScene}
            onUpdateSceneOrder={handleUpdateSceneOrder}
          />
        )}

        {/* Center */}
        <div className="center">
          {selectedScene ? (
            <SceneEditor
              scene={selectedScene}
              onSave={handleSceneSave}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-muted)' }}>
              Выберите сцену для редактирования
            </div>
          )}
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
          <span title="Количество слов">{wordCount} слов</span>
          <span title="Символы с пробелами">{charCount} знаков</span>
          <span title="Авторские листы (1 а.л. = 40 000 знаков)">{authorSheets} а.л.</span>
          <span title="Страницы (1 стр. = 1800 знаков)">{pages} стр.</span>
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
