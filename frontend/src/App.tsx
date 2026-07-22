import { useEffect, useState } from 'react'
import './App.css'
import { ManuscriptEditor } from './components/ManuscriptEditor'
import { SearchPanel } from './components/SearchPanel'
import type { Project, Scene, CodexEntry } from './types'

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)

  useEffect(() => {
    const initProject = async () => {
      try {
        const response = await fetch('/api/projects')
        const projects = await response.json()
        if (projects.length > 0) {
          setProject(projects[0])
        } else {
          // Create default project if none exists
          const createResponse = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Моя рукопись',
              ownerId: 'default-user',
            }),
          })
          const newProject = await createResponse.json()
          setProject(newProject)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    initProject()
  }, [])

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>
  }

  if (!project) {
    return <div className="error">Проект не найден</div>
  }

  return (
    <div className="app">
      <div className="app-header">
        {project && <SearchPanel projectId={project.id} />}
      </div>
      <div className="app-main">
        <ManuscriptEditor project={project} />
      </div>
    </div>
  )
}

export default App
