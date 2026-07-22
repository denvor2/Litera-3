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
}

export function Sidebar({
  books = [],
  project,
  selectedSceneId,
  onSceneSelect,
  onCreateScene,
  onUpdateSceneOrder,
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
      <details
        className="acc"
        open={openSection === 'manuscript'}
        onToggle={() => toggleSection('manuscript')}
      >
        <summary>📖 РУКОПИСЬ</summary>
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
                    <button
                      className="chapter-row"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <span className="toggle-icon">
                        {expandedChapters.has(chapter.id) ? '▾' : '▸'}
                      </span>
                      <span>{chapter.title}</span>
                      <div className="row-actions">
                        <button className="icon-btn" title="Редактировать">✎</button>
                        <button className="icon-btn" title="Удалить">🗑</button>
                      </div>
                    </button>

                    {expandedChapters.has(chapter.id) && (
                      <div
                        className="scenes-list"
                        onDragOver={handleChapterDragOver}
                        onDrop={(e) => handleChapterDrop(chapter.id, e)}
                      >
                        {chapter.scenes.map(scene => (
                          <button
                            key={scene.id}
                            draggable
                            className={`scene-row ${
                              selectedSceneId === scene.id ? 'selected' : ''
                            } ${draggedScene?.id === scene.id ? 'dragging' : ''}`}
                            onClick={() => onSceneSelect?.(scene)}
                            onDragStart={() => handleSceneDragStart(scene)}
                            onDragEnd={handleSceneDragEnd}
                          >
                            <div
                              className="dot"
                              style={{ backgroundColor: getStatusColor(scene.status) }}
                            ></div>
                            <span className="scene-title">{scene.title}</span>
                            <span className="scene-wc">{scene.wordCount}</span>
                            <div className="row-actions">
                              <button className="icon-btn" title="Редактировать">✎</button>
                              <button className="icon-btn" title="Удалить">🗑</button>
                            </div>
                          </button>
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
                  <span className="add-link">+ глава</span>
                </div>
              </div>
            </div>
          ))}
          <div className="add-item">
            <span className="add-link">+ книга</span>
          </div>
        </div>
      </details>

      {/* Кодекс */}
      <details
        className="acc"
        open={openSection === 'codex'}
        onToggle={() => toggleSection('codex')}
      >
        <summary>📚 КОДЕКС</summary>
        <div className="acc-body">
          <div className="codex-subhead">Персонажи</div>
          <div className="add-item">
            <span className="add-link">+ персонаж</span>
          </div>
          <div className="codex-subhead" style={{marginTop: '12px'}}>Локации</div>
          <div className="add-item">
            <span className="add-link">+ локация</span>
          </div>
        </div>
      </details>

      {/* Заметки */}
      <details
        className="acc"
        open={openSection === 'notes'}
        onToggle={() => toggleSection('notes')}
      >
        <summary>📝 ЗАМЕТКИ</summary>
        <div className="acc-body">
          <textarea className="notes-box" placeholder="Заметки на полях..."></textarea>
        </div>
      </details>

      {/* Корзина */}
      <details
        className="acc"
        open={openSection === 'trash'}
        onToggle={() => toggleSection('trash')}
      >
        <summary>🗑️ КОРЗИНА</summary>
        <div className="acc-body">
          <div className="trash-empty">Корзина пуста</div>
        </div>
      </details>
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
