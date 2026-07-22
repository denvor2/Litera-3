import { useEffect, useState } from 'react'
import './App.css'
import { ManuscriptEditor } from './components/ManuscriptEditor'
import { SearchPanel } from './components/SearchPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsDialog } from './components/SettingsDialog'
import { ThemeProvider } from './contexts/ThemeContext'
import type { Project, Scene, CodexEntry } from './types'

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const initProject = async () => {
      try {
        const apiUrl = 'http://localhost:3000/api/projects'
        console.log('Fetching projects from:', apiUrl)
        const response = await fetch(apiUrl)
        console.log('Response status:', response.status, response.statusText)

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`)
        }

        const text = await response.text()
        console.log('Response text length:', text.length)
        console.log('Response text:', text.substring(0, 200))

        if (!text) {
          throw new Error('Empty response from API')
        }

        const projects = JSON.parse(text)
        console.log('Parsed projects:', projects.length)

        if (projects.length > 0) {
          console.log('Using first project:', projects[0].title)
          setProject(projects[0])
        } else {
          console.log('No projects found, creating new one...')
          const createResponse = await fetch('http://localhost:3000/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Моя рукопись',
              ownerId: 'default-user',
            }),
          })
          if (!createResponse.ok) throw new Error(`Create failed: ${createResponse.status}`)
          const newProject = await createResponse.json()
          console.log('Created project:', newProject.title)
          setProject(newProject)
        }
      } catch (err) {
        console.error('Full error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Error message:', msg)
        setError(msg)
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
    return (
      <div className="error" style={{ padding: '20px', whiteSpace: 'pre-wrap', textAlign: 'left', fontFamily: 'monospace' }}>
        <h3>Ошибка при загрузке проекта:</h3>
        <code>{error}</code>
        <p style={{ fontSize: '12px', marginTop: '20px', color: '#666' }}>
          Откройте F12 → Network tab, сделайте Ctrl+R и проверьте запрос к /api/projects
        </p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="error">
        <p>Проект не найден</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Откройте F12 (DevTools) → Console для диагностики
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="app">
        <div className="app-header">
          <div className="app-header-content">
            {project && <SearchPanel projectId={project.id} />}
            <ThemeToggle />
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="Настройки"
            >
              ⚙️
            </button>
          </div>
        </div>
        <div className="app-main">
          <ManuscriptEditor project={project} />
        </div>
      </div>
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

export default App
