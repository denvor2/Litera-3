import { useState, useCallback } from 'react'
import type { Book, Scene } from '../types'
import { SceneEditor } from './SceneEditor'
import './ManuscriptFlow.css'

interface ManuscriptFlowProps {
  book: Book
  selectedScene: Scene | null
  onSelectScene: (scene: Scene) => void
  onStatusChange: (sceneId: string, newStatus: string) => void
  onSaveScene: (scene: Scene) => void
  onEditScene: (sceneId: string, chapterId: string, data: Record<string, any>) => void
  onMentionClick?: (entryId: string) => void
}

export function ManuscriptFlow({
  book,
  selectedScene,
  onSelectScene: _onSelectScene, // TODO: использовать для клика на сцену
  onStatusChange,
  onSaveScene,
  onEditScene: _onEditScene, // TODO: использовать для ✎ сцены
  onMentionClick: _onMentionClick, // TODO: использовать для клика на упоминание
}: ManuscriptFlowProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }, [])

  const toggleScene = useCallback((sceneId: string) => {
    setExpandedScenes(prev => {
      const next = new Set(prev)
      if (next.has(sceneId)) {
        next.delete(sceneId)
      } else {
        next.add(sceneId)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allChapters = new Set(book.chapters.map(c => c.id))
    const allScenes = new Set(book.chapters.flatMap(c => (c.scenes || []).map(s => s.id)))
    setExpandedChapters(allChapters)
    setExpandedScenes(allScenes)
    setAllExpanded(true)
  }, [book])

  const collapseAll = useCallback(() => {
    setExpandedChapters(new Set())
    if (selectedScene) {
      setExpandedScenes(new Set([selectedScene.id]))
    } else {
      setExpandedScenes(new Set())
    }
    setAllExpanded(false)
  }, [selectedScene])

  return (
    <div className="manuscript-flow">
      <div className="flow-toolbar">
        <button className="flow-toggle-btn" onClick={expandAll} disabled={allExpanded}>
          Развернуть всю книгу
        </button>
        <button className="flow-toggle-btn" onClick={collapseAll} disabled={!allExpanded && expandedScenes.size <= 1}>
          Свернуть до одной
        </button>
      </div>

      <div className="flow-content">
        {book.chapters.map(chapter => (
          <div key={chapter.id} className="ms-chapter">
            <div
              className="ms-chapter-header"
              onClick={() => toggleChapter(chapter.id)}
            >
              <span className="ms-chapter-toggle">
                {expandedChapters.has(chapter.id) ? '▾' : '▸'}
              </span>
              <h2 className="ms-chapter-title">{chapter.title}</h2>
            </div>

            {expandedChapters.has(chapter.id) && (
              <div className="ms-chapter-content">
                {(chapter.scenes || []).map(scene => (
                  <div key={scene.id} className={`ms-scene ${selectedScene?.id === scene.id ? 'selected' : ''}`}>
                    <div className="ms-scene-header" onClick={() => toggleScene(scene.id)}>
                      <span className="ms-scene-toggle">
                        {expandedScenes.has(scene.id) ? '▾' : '▸'}
                      </span>
                      <div className="ms-scene-info">
                        <span className="ms-scene-title">{scene.title}</span>
                        <select
                          className="ms-scene-status"
                          value={scene.status || 'draft'}
                          onChange={(e) => {
                            e.stopPropagation()
                            onStatusChange(scene.id, e.target.value)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="draft">Черновик</option>
                          <option value="editing">Редактирование</option>
                          <option value="done">Готово</option>
                        </select>
                        <span className="ms-scene-wc">{scene.wordCount} слов</span>
                      </div>
                    </div>

                    {expandedScenes.has(scene.id) && (
                      <div className="ms-scene-editor">
                        <SceneEditor
                          scene={scene}
                          onSave={onSaveScene}
                          onMentionClick={_onMentionClick}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
