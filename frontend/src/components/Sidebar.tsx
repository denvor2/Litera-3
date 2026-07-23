import { useState, useCallback, useEffect } from 'react'
import type { Book, Scene, Project } from '../types'
import { API_BASE } from '../config'
import './Sidebar.css'

interface TrashItem {
  type: 'book' | 'chapter' | 'scene' | 'codexentry'
  id: string
  title: string
  bookId?: string
}

interface SidebarProps {
  books?: Book[]
  project?: Project
  selectedSceneId?: string
  selectedBookId?: string
  onSceneSelect?: (scene: Scene) => void
  onBookSelect?: (bookId: string) => void
  onCreateScene?: (chapterId: string) => void
  onUpdateSceneOrder?: (sceneId: string, newChapterId: string, newOrder: number) => void
  onCreateBook?: () => void
  onCreateChapter?: (bookId: string) => void
  onDeleteBook?: (bookId: string) => void
  onDeleteChapter?: (chapterId: string) => void
  onDeleteScene?: (sceneId: string) => void
  onCreateCodexEntry?: (type: 'character' | 'location') => void
  onEditChapter?: (chapterId: string, bookId: string, title: string) => void
  onEditScene?: (sceneId: string, chapterId: string, data: Record<string, any>) => void
  onEditCodexEntry?: (entryId: string, data: Record<string, any>) => void
  onNotesChange?: (notes: string) => void
  selectedScene?: Scene
}

export function Sidebar({
  books = [],
  project,
  selectedSceneId,
  selectedBookId,
  selectedScene,
  onSceneSelect,
  onBookSelect,
  onCreateScene,
  onUpdateSceneOrder,
  onCreateBook,
  onCreateChapter,
  onDeleteBook,
  onDeleteChapter,
  onDeleteScene,
  onCreateCodexEntry,
  onEditChapter,
  onEditScene,
  onEditCodexEntry,
  onNotesChange,
}: SidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [openSection, setOpenSection] = useState<'manuscript' | 'codex' | 'notes' | 'trash'>('manuscript')
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null)
  const [trashItems, setTrashItems] = useState<TrashItem[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
  const currentBookId = selectedBookId || books[0]?.id

  useEffect(() => {
    if (openSection === 'trash' && project && trashItems.length === 0) {
      loadTrash()
    }
  }, [openSection, project])

  const loadTrash = async () => {
    if (!project) return
    setTrashLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/trash/${project.id}`)
      if (response.ok) {
        const data = await response.json()
        // API returns grouped object, convert to flat array
        const items: TrashItem[] = [
          ...(data.books || []).map((b: any) => ({ type: 'book' as const, id: b.id, title: b.title })),
          ...(data.chapters || []).map((c: any) => ({ type: 'chapter' as const, id: c.id, title: c.title })),
          ...(data.scenes || []).map((s: any) => ({ type: 'scene' as const, id: s.id, title: s.title })),
          ...(data.codexEntries || []).map((e: any) => ({ type: 'codexentry' as const, id: e.id, title: e.name }))
        ]
        setTrashItems(items)
      }
    } catch (error) {
      console.error('Failed to load trash:', error)
    } finally {
      setTrashLoading(false)
    }
  }

  const handleRestore = async (item: TrashItem) => {
    try {
      const endpoint = `${API_BASE}/api/trash/${item.type}/${item.id}/restore`
      const response = await fetch(endpoint, { method: 'PUT' })
      if (response.ok) {
        setTrashItems(trashItems.filter(t => t.id !== item.id))
      }
    } catch (error) {
      console.error('Failed to restore item:', error)
    }
  }

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
        <div className="books-list">
          {books.map(book => (
            <div
              key={book.id}
              className={`book-row ${currentBookId === book.id ? 'selected' : ''}`}
              onClick={() => onBookSelect?.(book.id)}
            >
              <span>{book.title}</span>
              <div className="row-actions">
                <button className="icon-btn" title="Редактировать">✎</button>
                <button className="icon-btn" title="Удалить" onClick={() => onDeleteBook?.(book.id)}>🗑</button>
              </div>
            </div>
          ))}
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateBook?.()}
            >+ добавить книгу</button>
          </div>
        </div>
      </div>

      {/* Аккордеон секций */}
      <div className="acc">
        <button
          className="acc-summary"
          onClick={() => toggleSection('manuscript')}
        >
          <span className="acc-arrow">{openSection === 'manuscript' ? '▾' : '▸'}</span>
          РУКОПИСЬ
        </button>
        {openSection === 'manuscript' && (
        <div className="acc-body">
          {books
            .filter(book => book.id === currentBookId)
            .map(book => (
            <div key={book.id} className="book-section">
              <div className="book-row">
                <span>{book.title}</span>
                <div className="row-actions">
                  <button className="icon-btn" title="Редактировать">✎</button>
                  <button className="icon-btn" title="Удалить" onClick={() => onDeleteBook?.(book.id)}>🗑</button>
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
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditChapter?.(chapter.id, book.id, chapter.title)
                          }}
                        >
                          ✎
                        </button>
                        <button
                          className="icon-btn"
                          title="Удалить"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteChapter?.(chapter.id)
                          }}
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
                              <button className="icon-btn" title="Редактировать" onClick={(e) => {
                                e.stopPropagation()
                                onEditScene?.(scene.id, chapter.id, { title: scene.title, status: scene.status })
                              }}>✎</button>
                              <button className="icon-btn" title="Удалить" onClick={(e) => {
                                e.stopPropagation()
                                onDeleteScene?.(scene.id)
                              }}>🗑</button>
                            </div>
                          </div>
                        ))}
                        <div className="add-item">
                          <button
                            className="add-link"
                            onClick={() => onCreateScene?.(chapter.id)}
                          >+ добавить сцену</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="add-item">
                  <button
                    className="add-link"
                    onClick={() => onCreateChapter?.(book.id)}
                  >+ добавить главу</button>
                </div>
              </div>
            </div>
          ))}
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateBook?.()}
            >+ добавить книгу</button>
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
          КОДЕКС
        </button>
        {openSection === 'codex' && (
        <div className="acc-body">
          <div className="codex-subhead">Персонажи</div>
          {project?.codexEntries
            ?.filter((e: any) => e.type === 'character')
            .map((entry: any) => {
              const initials = entry.name
                .split(' ')
                .slice(0, 2)
                .map((word: string) => word.charAt(0).toUpperCase())
                .join('')
              return (
                <div key={entry.id} className="chip">
                  <div className="chip-avatar">{initials}</div>
                  <div className="chip-name">{entry.name}</div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="chip-type">перс.</div>
                    <div className="row-actions">
                      <button className="icon-btn" title="Редактировать" onClick={() => {
                        onEditCodexEntry?.(entry.id, { name: entry.name, attributes: entry.attributes, type: entry.type })
                      }}>✎</button>
                      <button className="icon-btn" title="Удалить">🗑</button>
                    </div>
                  </div>
                </div>
              )
            })}
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateCodexEntry?.('character')}
            >+ добавить персонажа</button>
          </div>
          <div className="codex-subhead" style={{marginTop: '12px'}}>Локации</div>
          {project?.codexEntries
            ?.filter((e: any) => e.type === 'location')
            .map((entry: any) => {
              const initials = entry.name
                .split(' ')
                .slice(0, 2)
                .map((word: string) => word.charAt(0).toUpperCase())
                .join('')
              return (
                <div key={entry.id} className="chip">
                  <div className="chip-avatar">{initials}</div>
                  <div className="chip-name">{entry.name}</div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="chip-type">лок.</div>
                    <div className="row-actions">
                      <button className="icon-btn" title="Редактировать" onClick={() => {
                        onEditCodexEntry?.(entry.id, { name: entry.name, attributes: entry.attributes, type: entry.type })
                      }}>✎</button>
                      <button className="icon-btn" title="Удалить">🗑</button>
                    </div>
                  </div>
                </div>
              )
            })}
          <div className="add-item">
            <button
              className="add-link"
              onClick={() => onCreateCodexEntry?.('location')}
            >+ добавить локацию</button>
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
          ЗАМЕТКИ
        </button>
        {openSection === 'notes' && (
        <div className="acc-body">
          <textarea
            className="notes-box"
            placeholder="Заметки на полях..."
            value={selectedScene?.notes || ''}
            onChange={(e) => onNotesChange?.(e.target.value)}
          ></textarea>
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
          КОРЗИНА
          {trashItems.length > 0 && <span className="badge">{trashItems.length}</span>}
        </button>
        {openSection === 'trash' && (
        <div className="acc-body">
          {trashLoading ? (
            <div className="trash-empty">Загрузка...</div>
          ) : trashItems.length === 0 ? (
            <div className="trash-empty">Корзина пуста</div>
          ) : (
            <div className="trash-items">
              {trashItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="trash-item">
                  <span className="trash-item-title">{item.title}</span>
                  <button
                    className="trash-restore-link"
                    onClick={() => handleRestore(item)}
                    title="Восстановить"
                  >
                    восстановить
                  </button>
                </div>
              ))}
            </div>
          )}
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
