import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Scene } from '../types'
import { countWords } from '../utils/wordCount'
import { VersionHistory } from './VersionHistory'
import './SceneEditor.css'

interface SceneEditorProps {
  scene: Scene
  onSave: (scene: Scene) => void
  writeMode: boolean
  onToggleWriteMode: () => void
  onToggleCodex?: () => void
}

const AUTOSAVE_DELAY = 2000 // 2 seconds

export function SceneEditor({
  scene,
  onSave,
  writeMode,
  onToggleWriteMode,
  onToggleCodex,
}: SceneEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: scene.body,
    onUpdate({ editor }) {
      // Clear previous timer
      if (autoSaveTimer) clearTimeout(autoSaveTimer)

      setSaveStatus('saving')

      // Set new timer for autosave
      const timer = setTimeout(async () => {
        const content = editor.getJSON()
        const wordCount = countWords(editor.getText())
        const updatedScene = {
          ...scene,
          body: content,
          wordCount,
          updatedAt: new Date().toISOString(),
        }
        try {
          await onSave(updatedScene)
          setSaveStatus('saved')
        } catch (error) {
          console.error('Autosave failed:', error)
          setSaveStatus('error')
        }
      }, AUTOSAVE_DELAY)

      setAutoSaveTimer(timer)
    },
  })

  // Handle Esc key to exit write mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && writeMode) {
        onToggleWriteMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [writeMode, onToggleWriteMode])

  useEffect(() => {
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
    }
  }, [autoSaveTimer])

  const handleStatusChange = useCallback(
    async (newStatus: Scene['status']) => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      setSaveStatus('saving')

      try {
        const updatedScene = {
          ...scene,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        }
        await onSave(updatedScene)
        setSaveStatus('saved')
      } catch (error) {
        console.error('Failed to change status:', error)
        setSaveStatus('error')
      }
    },
    [scene, onSave, autoSaveTimer]
  )

  if (!editor) return null

  const statusLabels = {
    DRAFT: 'Черновик',
    EDITING: 'Редактирование',
    DONE: 'Готово',
  }

  const saveStatusIcon = {
    saved: '✓',
    saving: '⟳',
    error: '⚠',
  }

  return (
    <div className={`scene-editor ${writeMode ? 'write-mode' : ''}`}>
      <div className="scene-toolbar">
        <div className="scene-title-bar">
          <h1 contentEditable suppressContentEditableWarning>
            {scene.title}
          </h1>
          <div className="save-status">
            <span className={`status-icon ${saveStatus}`}>
              {saveStatusIcon[saveStatus]}
            </span>
          </div>
        </div>

        <div className="scene-meta">
          <div className="status-selector">
            <label>Статус: </label>
            <select
              value={scene.status}
              onChange={e => handleStatusChange(e.target.value as Scene['status'])}
            >
              <option value="DRAFT">Черновик</option>
              <option value="EDITING">Редактирование</option>
              <option value="DONE">Готово</option>
            </select>
          </div>

          <div className="word-count">
            {scene.wordCount} слов
          </div>

          <button onClick={onToggleWriteMode} className="write-mode-btn">
            {writeMode ? 'Закрыть режим письма' : 'Режим письма'}
          </button>

          {onToggleCodex && (
            <button onClick={onToggleCodex} className="codex-btn">
              📖 Кодекс
            </button>
          )}
        </div>
      </div>

      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>

      <div className="scene-notes">
        <textarea
          placeholder="Заметки на полях..."
          defaultValue={scene.notes}
          onBlur={e => {
            const updatedScene = {
              ...scene,
              notes: e.currentTarget.value,
              updatedAt: new Date().toISOString(),
            }
            onSave(updatedScene)
          }}
        />
      </div>

      <div className="scene-versions">
        <VersionHistory scene={scene} />
      </div>
    </div>
  )
}
