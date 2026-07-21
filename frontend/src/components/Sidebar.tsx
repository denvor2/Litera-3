import { useState, useCallback } from 'react'
import type { Book, Chapter, Scene } from '../types'
import './Sidebar.css'

interface SidebarProps {
  books: Book[]
  selectedSceneId?: string
  onSceneSelect: (scene: Scene) => void
  onCreateScene: (chapterId: string) => void
  onUpdateSceneOrder?: (sceneId: string, newChapterId: string, newOrder: number) => void
}

export function Sidebar({
  books,
  selectedSceneId,
  onSceneSelect,
  onCreateScene,
  onUpdateSceneOrder,
}: SidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
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
      <div className="sidebar-header">
        <h2>Рукопись</h2>
      </div>

      <div className="sidebar-content">
        {books.map(book => (
          <div key={book.id} className="book">
            <div className="book-title">
              <h3>{book.title}</h3>
            </div>

            <div className="chapters-list">
              {book.chapters.map(chapter => (
                <div key={chapter.id} className="chapter">
                  <button
                    className="chapter-title"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <span className="toggle-icon">
                      {expandedChapters.has(chapter.id) ? '▼' : '▶'}
                    </span>
                    <span>{chapter.title}</span>
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
                          className={`scene-item ${
                            selectedSceneId === scene.id ? 'selected' : ''
                          } ${draggedScene?.id === scene.id ? 'dragging' : ''}`}
                          onClick={() => onSceneSelect(scene)}
                          onDragStart={() => handleSceneDragStart(scene)}
                          onDragEnd={handleSceneDragEnd}
                        >
                          <span className="scene-status">{scene.status.slice(0, 1)}</span>
                          <span className="scene-title">{scene.title}</span>
                          <span className="scene-word-count">
                            {scene.wordCount}
                          </span>
                        </button>
                      ))}

                      <button
                        className="add-scene-btn"
                        onClick={() => onCreateScene(chapter.id)}
                      >
                        + Добавить сцену
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
