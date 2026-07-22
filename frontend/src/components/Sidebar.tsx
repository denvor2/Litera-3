import { useState, useCallback } from 'react'
import type { Book, Scene, Project } from '../types'
import './Sidebar.css'

interface SidebarProps {
  books?: Book[]
  project?: Project
  selectedSceneId?: string
  onSceneSelect?: (scene: Scene) => void
  onCreateScene?: (chapterId: string) => void
  onUpdateSceneOrder?: (sceneId: string, newChapterId: string, newOrder: number) => void
  onCreateBook?: () => void
  onCreateChapter?: (bookId: string) => void
  onCreateCodexEntry?: (type: 'character' | 'location') => void
}

export function Sidebar({
  books = [],
  project,
  selectedSceneId,
  onSceneSelect,
  onCreateScene,
  onUpdateSceneOrder,
  onCreateBook,
  onCreateChapter,
  onCreateCodexEntry,
}: SidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [openSection, setOpenSection] = useState<'manuscript' | 'codex' | 'notes' | 'trash'>('manuscript')
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null)

  const toggleChapter = (chapterId: string) => {
    const newSet = new Set(expandedChapters)
    if (newSet.has(chapterId)) {
      newSet.delete(chapterId)
    } else {
      newSet.add(chapterId)
    }
    setExpandedChapters(newSet)
  }

  const toggleSection = (section: 'manuscript' | 'codex' | 'notes' | 'trash') => {
    // Нельзя закрыть последнюю открытую секцию
    if (openSection === section) return
    setOpenSection(section)
  }

  const handleSceneDragStart = useCallback((scene: Scene) => {
    setDraggedScene(scene)
  }, [])

  const handleChapterDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleChapterDrop = useCallback(
    (chapterId: string, e: React.DragEvent) => {
      e.preventDefault()
      if (draggedScene && draggedScene.chapterId !== chapterId) {
        onUpdateSceneOrder?.(draggedScene.id, chapterId, 0)
      }
      setDraggedScene(null)
    },
    [draggedScene, onUpdateSceneOrder]
  )

  const handleSceneDragEnd = useCallback(() => {
    setDraggedScene(null)
  }, [])

  return (
    <aside className="sidebar">
      {/* Серия / Книга переключатель */}
      <div className="series-block">
        <div className="series-label">СЕРИЯ</div>
        <div className="series-name">{project?.title || 'Проект'}</div>
        <div className="book-switch-row">
          <select className="book-select" defaultValue={books[0]?.id || ''}>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
          <button className="add-book" title="Добавить книгу">+</button>
        </div>
      </div>

      {/* Аккордеон секций */}
      <div className="acc">
        <button
          className="acc-summary"
          onClick={() => toggleSection('manuscript')}
        >
          <span className="acc-arrow">{openSection === 'manuscript' ? '▾' : '▸'}</span>
          📖 РУКОПИСЬ
        </button>
        {openSection === 'manuscript' && (
        <div className="acc-body">
          {books.map(book => (
            <div key={book.id} className="book-section">
              <div className="book-row">
                <span>{book.title}</span>
                <div className="row-actions">
                  <button className="icon-btn" title="Редактировать">✎</button>
                  <button className="icon-btn" title="Удалить">🗑</button>
                </div>
              </div>

              <div className="chapters-list">
                {book.chapters.map(chapter => (
                  <div key={chapter.id} className="chapter-item">
                    <div className="chapter-row">
                      <button
                        className="chapter-toggle"
                        onClick={() => toggleChapter(chapter.id)}
                        title="Раскрыть главу"
                      >
                        <span className="toggle-icon">
                          {expandedChapters.has(chapter.id) ? '▾' : '▸'}
                        </span>
                      </button>
                      <span className="chapter-title">{chapter.title}</span>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          title="Редактировать"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ✎
                        </button>
                        <button
                          className="icon-btn"
                          title="Удалить"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {expandedChapters.has(chapter.id) && (
                      <div
                        className="scenes-list"
                        onDragOver={handleChapterDragOver}
                        onDrop={(e) => handleChapterDrop(chapter.id, e)}
                      >
                        {chapter.scenes.map(scene => (
                          <div
                            key={scene.id}
                            draggable
                            className={`scene-row ${
                              selectedSceneId === scene.id ? 'selected' : ''
                            } ${draggedScene?.id === scene.id ? 'dragging' : ''}`}
                            onDragStart={() => handleSceneDragStart(scene)}
                            onDragEnd={handleSceneDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                          >
                            <button
                              className="scene-select"
                              onClick={() => onSceneSelect?.(scene)}
                              title="Открыть сцену"
                            >
                              <div
                                className="dot"
                                style={{ backgroundColor: getStatusColor(scene.status) }}
                              ></div>
                              <span className="scene-title">{scene.title}</span>
                              <span className="scene-wc">{scene.wordCount}</span>
                            </button>
                            <div className="row-actions">
                              <button
                                className="icon-btn"
                                title="Переместить выше"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const sceneIndex = chapter.scenes.findIndex(s => s.id === scene.id)
                                  if (sceneIndex > 0) {
                                    const targetScene = chapter.scenes[sceneIndex - 1]
                                    onUpdateSceneOrder?.(scene.id, chapter.id, targetScene.order - 1)
                                  }
                                }}
                              >
                                ↑
                              </button>
                              <button
                                className="icon-btn"
                                title="Переместить ниже"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const sceneIndex = chapter.scenes.findIndex(s => s.id === scene.id)
                                  if (sceneIndex < chapter.scenes.length - 1) {
                                    const targetScene = chapter.scenes[sceneIndex + 1]
                                    onUpdateSceneOrder?.(scene.id, chapter.id, targetScene.order + 1)
                                  }
                                }}
                              >
                                ↓
                              </button>
                              <button className="icon-btn" title="Редактировать" onClick={(e) => e.stopPropagation()}>✎</button>
                              <button className="icon-btn" title="Удалить" onClick={(e) => e.stopPropagation()}>🗑</button>
                            </div>
                          </div>
                        ))}
                        <div className="add-item">
                          <button
                            className="add-link"
                            onClick={() => onCreateScene?.(chapter.id)}
                          >
                            + сцена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="add-item">
                  <button
                    className="add-link"
                    onClick={() => onCreateChapter?.(book.id)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    + глава
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateBook?.()}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              + книга
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Кодекс */}
      <div className="acc">
        <button
          className="acc-summary"
          onClick={() => toggleSection('codex')}
        >
          <span className="acc-arrow">{openSection === 'codex' ? '▾' : '▸'}</span>
          📚 КОДЕКС
        </button>
        {openSection === 'codex' && (
        <div className="acc-body">
          <div className="codex-subhead">Персонажи</div>
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateCodexEntry?.('character')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              + персонаж
            </button>
          </div>
          <div className="codex-subhead" style={{marginTop: '12px'}}>Локации</div>
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateCodexEntry?.('location')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              + локация
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Заметки */}
      <div className="acc">
        <button
          className="acc-summary"
          onClick={() => toggleSection('notes')}
        >
          <span className="acc-arrow">{openSection === 'notes' ? '▾' : '▸'}</span>
          📝 ЗАМЕТКИ
        </button>
        {openSection === 'notes' && (
        <div className="acc-body">
          <textarea className="notes-box" placeholder="Заметки на полях..."></textarea>
        </div>
        )}
      </div>

      {/* Корзина */}
      <div className="acc">
        <button
          className="acc-summary"
          onClick={() => toggleSection('trash')}
        >
          <span className="acc-arrow">{openSection === 'trash' ? '▾' : '▸'}</span>
          🗑️ КОРЗИНА
        </button>
        {openSection === 'trash' && (
        <div className="acc-body">
          <div className="trash-empty">Корзина пуста</div>
        </div>
        )}
      </div>
    </aside>
  )
}

function getStatusColor(status: string): string {
  const statusLower = status?.toLowerCase() || 'draft'
  switch (statusLower) {
    case 'draft':
      return '#9C9891'
    case 'editing':
      return '#B9812E'
    case 'done':
      return '#4A7A54'
    default:
      return '#9C9891'
  }
}
