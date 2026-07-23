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

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'done':
        return 'done'
      case 'editing':
        return 'editing'
      default:
        return 'draft'
    }
  }

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
        {book.chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id}>
            <div className="ms-chapter-divider">
              Глава {chapterIndex + 1}. {chapter.title}
            </div>

            {expandedChapters.has(chapter.id) && (
              <>
                {(chapter.scenes || []).map(scene => (
                  <div
                    key={scene.id}
                    className={`ms-scene ${expandedScenes.has(scene.id) ? 'expanded' : ''}`}
                    id={`scene-${scene.id}`}
                  >
                    <div
                      className="ms-scene-head"
                      onClick={() => toggleScene(scene.id)}
                    >
                      <span className="ms-scene-toggle">
                        {expandedScenes.has(scene.id) ? '▾' : '▸'}
                      </span>
                      <span className={`dot ${getStatusDot(scene.status || 'draft')}`} />
                      <span className="ms-scene-title">{scene.title}</span>
                      <span className="ms-scene-wc">{scene.wordCount} слов</span>
                    </div>

                    {expandedScenes.has(scene.id) && (
                      <div className="ms-scene-body">
                        <div className="meta-row">
                          <span>
                            <label>Статус</label>
                            <select
                              className="status-select"
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
                          </span>
                          <span>
                            <label>POV</label>
                            {scene.povCharacterId ? 'Персонаж' : 'Не выбран'}
                          </span>
                          <span>
                            <label>Локация</label>
                            Локация
                          </span>
                        </div>

                        <div className="toolbar">
                          <button title="Жирный"><b>Ж</b></button>
                          <button title="Курсив"><i>К</i></button>
                          <button title="Абзац">¶</button>
                        </div>

                        <SceneEditor
                          scene={scene}
                          onSave={onSaveScene}
                          onMentionClick={_onMentionClick}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
