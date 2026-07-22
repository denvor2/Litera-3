import { useState, useCallback, useEffect } from 'react'
import { API_BASE } from '../config'
import type { Scene, CodexEntry } from '../types'
import './SearchPanel.css'

interface SearchResult {
  scenes: Scene[]
  codexEntries: CodexEntry[]
  total: number
}

interface SearchPanelProps {
  projectId: string
  onSceneSelect?: (scene: Scene) => void
  onCodexSelect?: (entry: CodexEntry) => void
}

export function SearchPanel({ projectId, onSceneSelect, onCodexSelect }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults(null)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/search?projectId=${projectId}&query=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      setResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [projectId])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, handleSearch])

  return (
    <div className="search-panel">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="🔍 Поиск по сценам и Кодексу..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="search-input"
        />
        {isSearching && <span className="search-spinner">⟳</span>}
      </div>

      {showResults && results && (
        <div className="search-results">
          {results.total === 0 && query && (
            <div className="search-empty">Ничего не найдено</div>
          )}

          {results.scenes.length > 0 && (
            <div className="search-section">
              <h3>Сцены ({results.scenes.length})</h3>
              <ul className="search-list">
                {results.scenes.map(scene => (
                  <li key={scene.id}>
                    <button
                      className="search-result-item"
                      onClick={() => {
                        onSceneSelect?.(scene)
                        setShowResults(false)
                        setQuery('')
                      }}
                    >
                      <span className="result-icon">📄</span>
                      <div className="result-content">
                        <div className="result-title">{scene.title}</div>
                        <div className="result-meta">Сцена</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.codexEntries.length > 0 && (
            <div className="search-section">
              <h3>Кодекс ({results.codexEntries.length})</h3>
              <ul className="search-list">
                {results.codexEntries.map(entry => (
                  <li key={entry.id}>
                    <button
                      className="search-result-item"
                      onClick={() => {
                        onCodexSelect?.(entry)
                        setShowResults(false)
                        setQuery('')
                      }}
                    >
                      <span className="result-icon">{entry.type === 'character' ? '👤' : '📍'}</span>
                      <div className="result-content">
                        <div className="result-title">{entry.name}</div>
                        <div className="result-meta">
                          {entry.type === 'character' ? 'Персонаж' : 'Локация'}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
