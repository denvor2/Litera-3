import { useState } from 'react'
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

  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene)
  }

  const handleSceneSave = (updatedScene: Scene) => {
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
  }

  const handleCreateScene = async (chapterId: string) => {
    // API call to create scene
    const newScene: Scene = {
      id: crypto.randomUUID(),
      chapterId,
      title: 'Новая сцена',
      status: 'draft',
      povCharacterId: null,
      wordCount: 0,
      body: { type: 'doc', content: [] },
      notes: '',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

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
  }

  return (
    <div className="manuscript-editor">
      <Sidebar
        books={books}
        selectedSceneId={selectedScene?.id}
        onSceneSelect={handleSceneSelect}
        onCreateScene={handleCreateScene}
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
