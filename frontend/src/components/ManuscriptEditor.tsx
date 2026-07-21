import { useState, useEffect } from 'react'
import type { Project, Book, Chapter, Scene } from '../types'
import { SceneEditor } from './SceneEditor'
import { Sidebar } from './Sidebar'
import './ManuscriptEditor.css'

interface ManuscriptEditorProps {
  project: Project
}

export function ManuscriptEditor({ project }: ManuscriptEditorProps) {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [writeMode, setWriteMode] = useState(false)
  const [books, setBooks] = useState<Book[]>(project.books)

  // Auto-select first scene if available
  useEffect(() => {
    if (books.length > 0 && books[0].chapters && books[0].chapters.length > 0) {
      const firstScene = books[0].chapters[0].scenes?.[0]
      if (firstScene && !selectedScene) {
        setSelectedScene(firstScene)
      }
    }
  }, [books, selectedScene])

  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene)
  }

  const handleSceneSave = async (updatedScene: Scene) => {
    try {
      // Save to API
      await fetch(`/api/scenes/${updatedScene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedScene),
      })

      setSelectedScene(updatedScene)
      // Update in books tree
      setBooks(
        books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter => ({
            ...chapter,
            scenes: chapter.scenes.map(scene =>
              scene.id === updatedScene.id ? updatedScene : scene
            ),
          })),
        }))
      )
    } catch (error) {
      console.error('Failed to save scene:', error)
    }
  }

  const handleCreateScene = async (chapterId: string) => {
    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          title: 'Новая сцена',
          status: 'DRAFT',
        }),
      })
      const newScene: Scene = await response.json()

      setSelectedScene(newScene)
      setBooks(
        books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter =>
            chapter.id === chapterId
              ? { ...chapter, scenes: [...chapter.scenes, newScene] }
              : chapter
          ),
        }))
      )
    } catch (error) {
      console.error('Failed to create scene:', error)
    }
  }

  const handleUpdateSceneOrder = async (sceneId: string, newChapterId: string, newOrder: number) => {
    try {
      await fetch('/api/scenes/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ id: sceneId, chapterId: newChapterId, order: newOrder }],
        }),
      })

      // Update local state
      let movedScene: Scene | null = null
      setBooks(
        books
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
          }))
      )
    } catch (error) {
      console.error('Failed to update scene order:', error)
    }
  }

  return (
    <div className="manuscript-editor">
      <Sidebar
        books={books}
        selectedSceneId={selectedScene?.id}
        onSceneSelect={handleSceneSelect}
        onCreateScene={handleCreateScene}
        onUpdateSceneOrder={handleUpdateSceneOrder}
      />
      <div className="editor-area">
        {selectedScene ? (
          <SceneEditor
            scene={selectedScene}
            onSave={handleSceneSave}
            writeMode={writeMode}
            onToggleWriteMode={() => setWriteMode(!writeMode)}
          />
        ) : (
          <div className="no-scene-selected">
            Выберите сцену для редактирования
          </div>
        )}
      </div>
    </div>
  )
}
