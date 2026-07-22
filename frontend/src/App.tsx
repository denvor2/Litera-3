import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { SceneEditor } from './components/SceneEditor'
import { extractTextFromTipTap, countCharacters, countAuthorSheets, countPages } from './utils/wordCount'
import { API_BASE } from './config'
import type { Project, Scene } from './types'

export function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [rightWidth, setRightWidth] = useState(280)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  useEffect(() => {
    const initProject = async () => {
      try {
        const apiUrl = '${API_BASE}/api/projects'
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
      const response = await fetch(`${API_BASE}/api/scenes/${updatedScene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedScene),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
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
      const response = await fetch('${API_BASE}/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          title: 'Новая сцена',
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
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
      await fetch('${API_BASE}/api/scenes/order', {
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

  const handleCreateBook = async () => {
    if (!project) return
    try {
      const response = await fetch('${API_BASE}/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          title: `Книга ${project.books.length + 1}`,
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      const newBook = await response.json()

      setProject({
        ...project,
        books: [...project.books, newBook],
      })
    } catch (error) {
      console.error('Failed to create book:', error)
    }
  }

  const handleCreateChapter = async (bookId: string) => {
    if (!project) return
    try {
      const book = project.books.find(b => b.id === bookId)
      if (!book) return

      const response = await fetch('${API_BASE}/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          title: `Глава ${book.chapters.length + 1}`,
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      const newChapter = await response.json()

      setProject({
        ...project,
        books: project.books.map(b =>
          b.id === bookId ? { ...b, chapters: [...b.chapters, newChapter] } : b
        ),
      })
    } catch (error) {
      console.error('Failed to create chapter:', error)
    }
  }

  const handleCreateCodexEntry = async (type: 'character' | 'location') => {
    if (!project) return
    const name = type === 'character' ? `Персонаж ${Math.random().toString(36).substr(2, 5)}` : `Локация ${Math.random().toString(36).substr(2, 5)}`
    try {
      const response = await fetch(`${API_BASE}/api/codex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type,
          name,
          attributes: type === 'character'
            ? { appearance: '', personality: '', goal_conflict: '' }
            : { description: '' },
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      const newEntry = await response.json()
      setProject({
        ...project,
        codexEntries: [...(project.codexEntries || []), newEntry],
      })
      console.log(`Created ${type}:`, newEntry)
    } catch (error) {
      console.error(`Failed to create ${type}:`, error)
    }
  }

  if (loading) return <div className="app-loading">Загрузка...</div>
  if (error) return <div className="app-error"><h2>Ошибка</h2><p>{error}</p></div>
  if (!project) return <div className="app-error">Проект не найден</div>

  const wordCount = selectedScene?.wordCount ?? 0
  const sceneBody = selectedScene ? (typeof selectedScene.body === 'string' ? JSON.parse(selectedScene.body) : selectedScene.body) : null
  const sceneText = selectedScene && sceneBody ? extractTextFromTipTap(sceneBody) : ''
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
            <div className="hmenu" ref={menuRef}>
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
            onCreateBook={handleCreateBook}
            onCreateChapter={handleCreateChapter}
            onCreateCodexEntry={handleCreateCodexEntry}
          />
        )}

        {/* Center */}
        <div className="center">
          {selectedScene ? (
            <SceneEditor
              key={selectedScene.id}
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
              <div className="right-panel-header">🤖 AI-помощники</div>
              <div className="right-panel-content">
                <div className="expert-roles">
                  <div className="expert-chip">
                    <button className="chip-select" title="Активировать Соавтор">
                      <span className="chip-name">Соавтор</span>
                    </button>
                    <button className="chip-settings" title="Настройки">⚙</button>
                  </div>
                  <div className="expert-chip">
                    <button className="chip-select" title="Активировать Редактор">
                      <span className="chip-name">Редактор</span>
                    </button>
                    <button className="chip-settings" title="Настройки">⚙</button>
                  </div>
                  <div className="expert-chip">
                    <button className="chip-select" title="Активировать Критик">
                      <span className="chip-name">Критик</span>
                    </button>
                    <button className="chip-settings" title="Настройки">⚙</button>
                  </div>
                  <div className="expert-chip">
                    <button className="chip-select" title="Активировать Читатель">
                      <span className="chip-name">Читатель</span>
                    </button>
                    <button className="chip-settings" title="Настройки">⚙</button>
                  </div>
                </div>
                <button className="add-expert" title="Добавить помощника">+ свой</button>
                <div className="expert-note">
                  <p style={{ fontSize: '11px', color: 'var(--ink-muted)', margin: '8px 0' }}>
                    ℹ️ Настройка AI-помощников будет доступна в следующей версии.
                  </p>
                </div>
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
