import { useState, useCallback, useEffect, useRef } from 'react'
import type { Book, Scene } from '../types'
import { SceneEditor, type SceneEditorHandle } from './SceneEditor'
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
  const sceneEditorRef = useRef<SceneEditorHandle>(null)

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
  }, [book])

  const collapseAll = useCallback(() => {
    setExpandedChapters(new Set())
    if (selectedScene) {
      setExpandedScenes(new Set([selectedScene.id]))
    } else {
      setExpandedScenes(new Set())
    }
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

  // Auto-expand chapter containing selected scene
  useEffect(() => {
    if (selectedScene) {
      for (const chapter of book.chapters) {
        if (chapter.scenes?.some(s => s.id === selectedScene.id)) {
          setExpandedChapters(prev => new Set([...prev, chapter.id]))
          setExpandedScenes(prev => new Set([...prev, selectedScene.id]))
          break
        }
      }
    }
  }, [selectedScene, book.chapters])

  return (
    <div className="manuscript-flow">
      <div className="flow-toolbar">
        <div>
          <a onClick={expandAll} style={{ cursor: 'pointer', marginRight: '16px', color: 'var(--ink)' }}>
            Развернуть всю книгу
          </a>
          <a onClick={collapseAll} style={{ cursor: 'pointer', color: 'var(--ink)' }}>
            Свернуть до одной
          </a>
        </div>
      </div>

      <div className="flow-content">
        {book.chapters.map(chapter => (
          <div key={chapter.id}>
            <div className="ms-chapter-divider">
              {chapter.title}
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
                            {scene.locationId ? 'Локация' : 'Не выбрана'}
                          </span>
                        </div>

                        <div className="toolbar">
                          <button
                            title="Жирный"
                            onClick={() => sceneEditorRef.current?.toggleBold()}
                          >
                            <b>Ж</b>
                          </button>
                          <button
                            title="Курсив"
                            onClick={() => sceneEditorRef.current?.toggleItalic()}
                          >
                            <i>К</i>
                          </button>
                          <button
                            title="Новый абзац"
                            onClick={() => sceneEditorRef.current?.toggleBreak()}
                          >
                            ¶
                          </button>
                        </div>

                        <SceneEditor
                          ref={sceneEditorRef}
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
