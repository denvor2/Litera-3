import { useState, useCallback, useEffect } from 'react'
import type { Book, Scene, Project } from '../types'
import { API_BASE } from '../config'
import './Sidebar.css'

interface TrashItem {
  type: 'book' | 'chapter' | 'scene' | 'codexentry' | 'note'
  id: string
  title: string
  bookId?: string
}

interface SidebarProps {
  books?: Book[]
  project?: Project
  allSeries?: Project[]
  trashProjectId?: string  // ProjectId for loading trash (can be different from project)
  trashRefreshVersion?: number  // Incremented when trash should be refreshed
  selectedSceneId?: string
  selectedBookId?: string
  onSceneSelect?: (scene: Scene) => void
  onBookSelect?: (bookId: string) => void
  onSelectProject?: (projectId: string) => void
  onDeleteProject?: (projectId: string) => void
  onEditProject?: (project: Project) => void
  onCreateScene?: (chapterId: string) => void
  onUpdateSceneOrder?: (sceneId: string, newChapterId: string, newOrder: number) => void
  onCreateBook?: () => void
  onCreateChapter?: (bookId: string) => void
  onDeleteBook?: (bookId: string) => void
  onDeleteChapter?: (chapterId: string) => void
  onDeleteScene?: (sceneId: string) => void
  onCreateCodexEntry?: (type: 'character' | 'location') => void
  onCreateProject?: () => void
  onEditChapter?: (chapterId: string, bookId: string, title: string) => void
  onEditScene?: (sceneId: string, chapterId: string, data: Record<string, any>) => void
  onEditCodexEntry?: (entryId: string, data: Record<string, any>) => void
  onEditBook?: (bookId: string) => void
  onCreateNote?: () => void
  onEditNote?: (noteId: string, data: Record<string, any>) => void
  onDeleteNote?: (noteId: string) => void
  onNotesChange?: (notes: string) => void
  selectedScene?: Scene
}

export function Sidebar({
  books = [],
  project,
  allSeries = [],
  trashProjectId,
  trashRefreshVersion = 0,
  selectedSceneId,
  selectedBookId,
  selectedScene,
  onSceneSelect,
  onBookSelect,
  onSelectProject,
  onDeleteProject,
  onEditProject,
  onCreateScene,
  onUpdateSceneOrder,
  onCreateBook,
  onCreateChapter,
  onDeleteBook,
  onDeleteChapter,
  onDeleteScene,
  onCreateCodexEntry,
  onCreateProject,
  onEditChapter,
  onEditScene,
  onEditCodexEntry,
  onEditBook,
  onCreateNote,
  onEditNote,
  onDeleteNote,
  onNotesChange,
}: SidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [openSection, setOpenSection] = useState<'manuscript' | 'codex' | 'notes' | 'trash'>('manuscript')
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null)
  const [trashItems, setTrashItems] = useState<TrashItem[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
  const currentBookId = selectedBookId || books[0]?.id

  const loadTrash = useCallback(async () => {
    if (!trashProjectId) return
    setTrashLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/trash/${trashProjectId}`)
      if (response.ok) {
        const data = await response.json()
        // API returns grouped object, convert to flat array
        const items: TrashItem[] = [
          ...(data.books || []).map((b: any) => ({ type: 'book' as const, id: b.id, title: b.title })),
          ...(data.chapters || []).map((c: any) => ({ type: 'chapter' as const, id: c.id, title: c.title })),
          ...(data.scenes || []).map((s: any) => ({ type: 'scene' as const, id: s.id, title: s.title })),
          ...(data.codexEntries || []).map((e: any) => ({ type: 'codexentry' as const, id: e.id, title: e.name })),
          ...(data.notes || []).map((n: any) => ({ type: 'note' as const, id: n.id, title: n.title || 'Заметка без названия' }))
        ]
        setTrashItems(items)
      }
    } catch (error) {
      console.error('Failed to load trash:', error)
    } finally {
      setTrashLoading(false)
    }
  }, [trashProjectId])

  // Auto-expand all chapters by default
  useEffect(() => {
    if (books.length > 0) {
      const allChapterIds = new Set(
        books.flatMap(book => book.chapters.map(ch => ch.id))
      )
      setExpandedChapters(allChapterIds)
    }
  }, [books])

  useEffect(() => {
    // Load trash using trashProjectId (can be different from displayed project)
    if (trashProjectId) {
      loadTrash()
    }
  }, [trashProjectId, trashRefreshVersion, loadTrash])

  useEffect(() => {
    const handleStorageChange = () => {
      if (project) {
        loadTrash()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [project])

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

  const handlePermanentDelete = async (item: TrashItem) => {
    try {
      const endpoint = `${API_BASE}/api/trash/${item.type}/${item.id}/permanent`
      const response = await fetch(endpoint, { method: 'DELETE' })
      if (response.ok) {
        setTrashItems(trashItems.filter(t => t.id !== item.id))
      }
    } catch (error) {
      console.error('Failed to permanently delete item:', error)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="series-label">СЕРИЯ</div>
          <button
            className="add-link"
            style={{ fontSize: '14px', padding: '0 6px' }}
            onClick={() => onCreateProject?.()}
            title="Создать новую серию"
          >
            +
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch', marginBottom: '12px' }}>
          <select
            className="series-select"
            value={project?.id || 'no-series'}
            onChange={(e) => {
              if (e.target.value === 'no-series') {
                // Show all books without series filtering
                onSelectProject?.('no-series')
              } else {
                onSelectProject?.(e.target.value)
              }
            }}
            style={{ flex: 1 }}
          >
            {allSeries.map(series => (
              <option key={series.id} value={series.id}>
                {series.title} ({series.books?.length || 0})
              </option>
            ))}
            {allSeries.length > 0 && (
              <option value="" disabled style={{ backgroundColor: '#DEDAD0', height: '1px', padding: '0' }}>
                ─────────────────
              </option>
            )}
            <option value="no-series" style={{ fontStyle: 'italic', color: '#9C9891' }}>
              📚 Книги без серии ({allSeries.flatMap(s => s.books).filter(b => b.isInSeries === false).length})
            </option>
          </select>
          <button
            className="icon-btn"
            onClick={() => {
              if (project) {
                onEditProject?.(project)
              }
            }}
            title="Редактировать серию"
            disabled={!project}
            style={{ padding: '6px 8px', fontSize: '14px', flexShrink: 0, opacity: !project ? 0.5 : 1, cursor: !project ? 'not-allowed' : 'pointer' }}
          >
            ✎
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              if (project && window.confirm(`Удалить серию "${project.title}" в корзину? Это действие можно отменить.`)) {
                onDeleteProject?.(project.id)
              }
            }}
            title="Удалить серию в корзину"
            disabled={!project}
            style={{ padding: '6px 8px', fontSize: '14px', flexShrink: 0, opacity: !project ? 0.5 : 1, cursor: !project ? 'not-allowed' : 'pointer' }}
          >
            🗑
          </button>
        </div>
        <div className="books-list">
          {books.map(book => (
            <div
              key={book.id}
              className={`book-row ${currentBookId === book.id ? 'selected' : ''}`}
              onClick={() => onBookSelect?.(book.id)}
            >
              <span>{book.title}</span>
              <div className="row-actions">
                <button className="icon-btn" title="Редактировать" onClick={() => onEditBook?.(book.id)}>✎</button>
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
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', margin: '0 0 8px 0', color: 'var(--ink-2)' }}>Заметки проекта</h4>
            {project?.notes && project.notes.length > 0 && (
              <div className="notes-list">
                {project.notes.map(note => (
                  <div key={note.id} className="note-item">
                    <span className="note-title" onClick={() => onEditNote?.(note.id, { title: note.title, content: note.content })}>{note.title}</span>
                    <div className="row-actions">
                      <button className="icon-btn" title="Редактировать" onClick={() => onEditNote?.(note.id, { title: note.title, content: note.content })}>✎</button>
                      <button className="icon-btn" title="Удалить" onClick={() => onDeleteNote?.(note.id)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!project?.notes || project.notes.length === 0 && <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Нет заметок</div>}
            <div className="add-item">
              <button
                className="add-link"
                onClick={() => onCreateNote?.()}
              >+ добавить заметку</button>
            </div>
          </div>
          {selectedScene && (
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', margin: '0 0 8px 0', color: 'var(--ink-2)' }}>Заметки сцены</h4>
              <textarea
                className="notes-box"
                placeholder="Заметки на полях..."
                value={selectedScene?.notes || ''}
                onChange={(e) => onNotesChange?.(e.target.value)}
              ></textarea>
            </div>
          )}
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
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="trash-restore-link"
                      onClick={() => handleRestore(item)}
                      title="Восстановить"
                      style={{ fontSize: '14px', padding: '2px 6px' }}
                    >
                      ↩️
                    </button>
                    <button
                      className="trash-restore-link"
                      onClick={() => {
                        if (confirm(`Окончательно удалить "${item.title}"?`)) {
                          handlePermanentDelete(item)
                        }
                      }}
                      title="Окончательно удалить"
                      style={{ fontSize: '14px', padding: '2px 6px' }}
                    >
                      🗑️
                    </button>
                  </div>
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
      return 'var(--draft)'
    case 'editing':
      return 'var(--editing)'
    case 'done':
      return 'var(--done)'
    default:
      return 'var(--draft)'
  }
}
