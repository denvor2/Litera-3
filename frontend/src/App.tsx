import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { ManuscriptFlow } from './components/ManuscriptFlow'
import { AIPanel } from './components/AIPanel'
import { ExportButton } from './components/ExportButton'
import { ErrorBoundary } from './components/ErrorBoundary'
import { extractTextFromTipTap, countCharacters, countAuthorSheets, countPages } from './utils/wordCount'
import { API_BASE } from './config'
import type { Project, Scene, Book } from './types'

interface EditingItem {
  type: 'chapter' | 'scene' | 'codexEntry' | 'project'
  id: string
  parentId?: string // bookId для chapter, chapterId для scene, projectId для codexEntry
  data: Record<string, any>
}

export function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [rightWidth, setRightWidth] = useState(280)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeAIRole, setActiveAIRole] = useState('coauthor')
  const [aiScope, setAIScope] = useState<'scene' | 'chapter' | 'dialog' | 'selection'>('scene')
  const [aiMessages, setAIMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const menuRef = useRef<HTMLDivElement>(null)
  const noteSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAISendMessage = async (message: string) => {
    setAIMessages([...aiMessages, { role: 'user', content: message }])
    // TODO: отправить запрос на backend и получить ответ
    setTimeout(() => {
      setAIMessages(prev => [...prev, { role: 'assistant', content: 'Это ответ от AI (пока заглушка)' }])
    }, 500)
  }

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
        const apiUrl = `${API_BASE}/api/projects`
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

  const handleBookSelect = (bookId: string) => {
    setSelectedBookId(bookId)
    // Deselect scene when switching books
    setSelectedScene(null)
  }

  const handleSceneSave = async (updatedScene: Scene) => {
    if (!project) return
    try {
      setSaveStatus('saving')
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
      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save scene:', error)
      setSaveStatus('error')
    }
  }

  const handleCreateScene = async (chapterId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/scenes`, {
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
      await fetch(`${API_BASE}/api/scenes/order`, {
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
      const response = await fetch(`${API_BASE}/api/books`, {
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

      const response = await fetch(`${API_BASE}/api/chapters`, {
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

  const handleEdit = (type: 'chapter' | 'scene' | 'codexEntry', id: string, parentId: string | undefined, data: Record<string, any>) => {
    setEditingItem({ type, id, parentId, data: { ...data } })
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !project) return
    try {
      const { type, id, data } = editingItem
      let endpoint: string
      let method: 'POST' | 'PUT' = 'PUT'

      if (type === 'project' && id === 'new') {
        endpoint = '/api/projects'
        method = 'POST'
      } else if (type === 'chapter') {
        endpoint = `/api/chapters/${id}`
      } else if (type === 'scene') {
        endpoint = `/api/scenes/${id}`
      } else if (type === 'codexEntry') {
        endpoint = `/api/codex/${id}`
      } else if (type === 'project') {
        endpoint = `/api/projects/${id}`
      } else {
        return
      }

      // Remove type from data before sending (it's UI-only)
      const { type: _, ...dataToSend } = data
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const updated = await response.json()

      if (type === 'project' && id === 'new') {
        // After creating project, reload projects list
        const projectsResponse = await fetch(`${API_BASE}/api/projects`)
        if (projectsResponse.ok) {
          const projects = await projectsResponse.json()
          if (projects.length > 0) {
            setProject(projects[0])
          }
        }
      } else if (type === 'chapter') {
        setProject({
          ...project,
          books: project.books.map(b =>
            b.chapters?.find(c => c.id === id)
              ? { ...b, chapters: b.chapters.map(c => (c.id === id ? updated : c)) }
              : b
          ),
        })
      } else if (type === 'scene') {
        const updatedBooks = project.books.map(b => ({
          ...b,
          chapters: b.chapters.map(c =>
            c.scenes?.find(s => s.id === id)
              ? { ...c, scenes: c.scenes.map(s => (s.id === id ? updated : s)) }
              : c
          ),
        }))
        setProject({ ...project, books: updatedBooks })
        if (selectedScene?.id === id) setSelectedScene(updated)
      } else if (type === 'codexEntry') {
        setProject({
          ...project,
          codexEntries: project.codexEntries?.map(e => (e.id === id ? updated : e)) || [],
        })
      }
      setEditingItem(null)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const handleNotesChange = async (notes: string) => {
    if (!selectedScene) return
    // Дебаунс 2 сек
    if (noteSaveTimeoutRef.current) clearTimeout(noteSaveTimeoutRef.current)
    noteSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/scenes/${selectedScene.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const updated = await response.json()
        setSelectedScene(updated)
      } catch (error) {
        console.error('Failed to save notes:', error)
      }
    }, 2000)
  }

  const handleDeleteScene = async (sceneId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/scenes/${sceneId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      // Update project state
      if (selectedScene?.id === sceneId) {
        setSelectedScene(null)
      }
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter => ({
            ...chapter,
            scenes: chapter.scenes.filter(scene => scene.id !== sceneId),
          })),
        })),
      })
    } catch (error) {
      console.error('Failed to delete scene:', error)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/chapters/${chapterId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.filter(chapter => chapter.id !== chapterId),
        })),
      })
    } catch (error) {
      console.error('Failed to delete chapter:', error)
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/books/${bookId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject({
        ...project,
        books: project.books.filter(book => book.id !== bookId),
      })
    } catch (error) {
      console.error('Failed to delete book:', error)
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
    } catch (error) {
      console.error(`Failed to create ${type}:`, error)
    }
  }

  const handleCreateProject = () => {
    setEditingItem({ type: 'project', id: 'new', data: { title: '' } })
  }

  if (loading) return <div className="app-loading">Загрузка...</div>
  if (error) return <div className="app-error"><h2>Ошибка</h2><p>{error}</p></div>
  if (!project) return <div className="app-error">Проект не найден</div>

  const wordCount = selectedScene?.wordCount ?? 0
  const sceneBody = selectedScene?.body
  const sceneText = selectedScene && sceneBody ? extractTextFromTipTap(sceneBody) : ''
  const charCount = countCharacters(sceneText, true)
  const authorSheets = countAuthorSheets(charCount).toFixed(2)
  const pages = countPages(charCount).toFixed(0)

  const currentBook = project?.books.find(b => b.id === selectedBookId) || project?.books[0]

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
              <div className="hmenu-sep"></div>
              <div className="hmenu-item">📚 История версий</div>
              <div className="hmenu-sep"></div>
              <div className="hmenu-item">❓ Руководство</div>
              <div className="hmenu-item">⚙️ Настройки</div>
            </div>
          )}
          <h1 className="topbar-title">LitStudio 2</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="topbar-btn"
            onClick={() => setZenMode(!zenMode)}
            title={zenMode ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          >
            {zenMode ? '⛔' : '⛺'}
          </button>
          {currentBook && <ExportButton book={currentBook as Book} />}
        </div>
      </div>

      {/* Workspace */}
      <div className="workspace" style={{ '--right-w': `${rightWidth}px` } as any}>
        {/* Sidebar */}
        {!zenMode && (
          <ErrorBoundary>
            <Sidebar
              project={project}
              books={project.books}
              selectedSceneId={selectedScene?.id}
              selectedBookId={selectedBookId || undefined}
              selectedScene={selectedScene || undefined}
              onSceneSelect={handleSceneSelect}
              onBookSelect={handleBookSelect}
              onCreateScene={handleCreateScene}
              onUpdateSceneOrder={handleUpdateSceneOrder}
              onCreateBook={handleCreateBook}
              onCreateChapter={handleCreateChapter}
              onDeleteBook={handleDeleteBook}
              onDeleteChapter={handleDeleteChapter}
              onDeleteScene={handleDeleteScene}
              onCreateCodexEntry={handleCreateCodexEntry}
              onCreateProject={handleCreateProject}
              onEditChapter={(chapterId, bookId, title) => handleEdit('chapter', chapterId, bookId, { title })}
              onEditScene={(sceneId, chapterId, data) => handleEdit('scene', sceneId, chapterId, data)}
              onEditCodexEntry={(entryId, data) => handleEdit('codexEntry', entryId, undefined, data)}
              onNotesChange={handleNotesChange}
            />
          </ErrorBoundary>
        )}

        {/* Center */}
        <div className="center">
          {editingItem ? (
            <div className="center-card">
              <div className="center-back">
                <button
                  className="back-link"
                  onClick={() => setEditingItem(null)}
                  title="Назад"
                >
                  ← Назад
                </button>
              </div>
              <div className="head">
                {editingItem.type === 'chapter' ? (
                  <h2>Редактировать главу</h2>
                ) : editingItem.type === 'scene' ? (
                  <h2>Редактировать сцену</h2>
                ) : editingItem.type === 'project' ? (
                  <h2>{editingItem.id === 'new' ? 'Создать серию' : 'Редактировать серию'}</h2>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="avatar-lg">
                      {editingItem.data.name?.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('')}
                    </div>
                    <div>
                      <h2>{editingItem.data.name}</h2>
                      <div className="subtitle">
                        {editingItem.data.type === 'character' ? 'персонаж' : 'локация'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {editingItem.type === 'chapter' && (
                <div className="field">
                  <label>Название</label>
                  <input
                    type="text"
                    value={editingItem.data.title}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                    className="bc-input"
                    placeholder="Название главы"
                  />
                </div>
              )}

              {editingItem.type === 'scene' && (
                <>
                  <div className="field">
                    <label>Название</label>
                    <input
                      type="text"
                      value={editingItem.data.title}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                      className="bc-input"
                      placeholder="Название сцены"
                    />
                  </div>
                  <div className="field">
                    <label>Статус</label>
                    <select
                      value={editingItem.data.status || 'draft'}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, status: e.target.value } })}
                      className="bc-select"
                    >
                      <option value="draft">Черновик</option>
                      <option value="editing">Редактирование</option>
                      <option value="done">Готово</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Целевой объём (слов)</label>
                    <input
                      type="number"
                      value={editingItem.data.targetWordCount || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, targetWordCount: e.target.value ? parseInt(e.target.value) : null } })}
                      className="bc-input"
                      placeholder="Например: 5000"
                      min="0"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'project' && (
                <div className="field">
                  <label>Название серии</label>
                  <input
                    type="text"
                    value={editingItem.data.title}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                    className="bc-input"
                    placeholder="Название новой серии"
                    autoFocus
                  />
                </div>
              )}

              {editingItem.type === 'codexEntry' && (
                <>
                  <div className="field">
                    <label>Название</label>
                    <input
                      type="text"
                      value={editingItem.data.name}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                      className="bc-input"
                      placeholder="Название записи"
                    />
                  </div>
                  {editingItem.data.type === 'character' ? (
                    <>
                      <div className="field">
                        <label>Внешность</label>
                        <textarea
                          value={editingItem.data.attributes?.appearance || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            data: {
                              ...editingItem.data,
                              attributes: { ...editingItem.data.attributes, appearance: e.target.value }
                            }
                          })}
                          className="bc-textarea"
                          placeholder="Описание внешности"
                          rows={4}
                        />
                      </div>
                      <div className="field">
                        <label>Характер</label>
                        <textarea
                          value={editingItem.data.attributes?.personality || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            data: {
                              ...editingItem.data,
                              attributes: { ...editingItem.data.attributes, personality: e.target.value }
                            }
                          })}
                          className="bc-textarea"
                          placeholder="Черты характера и поведение"
                          rows={4}
                        />
                      </div>
                      <div className="field">
                        <label>Цель / конфликт</label>
                        <textarea
                          value={editingItem.data.attributes?.goal_conflict || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            data: {
                              ...editingItem.data,
                              attributes: { ...editingItem.data.attributes, goal_conflict: e.target.value }
                            }
                          })}
                          className="bc-textarea"
                          placeholder="Цель персонажа и основной конфликт"
                          rows={4}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="field">
                      <label>Описание</label>
                      <textarea
                        value={editingItem.data.attributes?.description || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: {
                            ...editingItem.data,
                            attributes: { ...editingItem.data.attributes, description: e.target.value }
                          }
                        })}
                        className="bc-textarea"
                        placeholder="Описание локации"
                        rows={6}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="bc-actions">
                <button className="bc-btn" onClick={() => setEditingItem(null)}>Отмена</button>
                <button className="bc-btn primary" onClick={handleSaveEdit}>Сохранить</button>
              </div>
            </div>
          ) : currentBook ? (
            <ManuscriptFlow
              book={currentBook}
              selectedScene={selectedScene}
              onSelectScene={handleSceneSelect}
              onStatusChange={(sceneId, newStatus) => {
                const scene = currentBook.chapters
                  .flatMap(c => c.scenes)
                  .find(s => s.id === sceneId)
                if (scene) {
                  handleSceneSave({ ...scene, status: newStatus as any })
                }
              }}
              onSaveScene={handleSceneSave}
              onEditScene={() => {}}
              onMentionClick={() => {}}
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
              <AIPanel
                activeRole={activeAIRole}
                onSelectRole={setActiveAIRole}
                scope={aiScope}
                onScopeChange={setAIScope}
                messages={aiMessages}
                onSendMessage={handleAISendMessage}
                contextInfo="текст этой сцены + Кодекс серии"
              />
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

        {/* Progress bar */}
        {selectedScene && selectedScene.targetWordCount && (
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, (wordCount / selectedScene.targetWordCount) * 100)}%`,
                  backgroundColor: wordCount >= selectedScene.targetWordCount ? 'var(--done)' : 'var(--accent)'
                }}
              />
            </div>
            <span className="progress-text">
              {wordCount} / {selectedScene.targetWordCount} слов
            </span>
          </div>
        )}

        <div className="save-state">
          <span
            className="save-dot"
            style={{
              backgroundColor:
                saveStatus === 'saved' ? 'var(--done)' :
                saveStatus === 'saving' ? 'var(--accent)' :
                'var(--error)'
            }}
            title={saveStatus}
          />
          <span>
            {saveStatus === 'saved' ? 'Сохранено' :
             saveStatus === 'saving' ? 'Сохраняется...' :
             'Ошибка сохранения'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
