import { useState } from 'react'
import type { CodexEntry } from '../types'
import { CodexList } from './CodexList'
import { CodexForm } from './CodexForm'
import './CodexPanel.css'

interface CodexPanelProps {
  projectId: string
  characters: CodexEntry[]
  locations: CodexEntry[]
  onCreateEntry?: (entry: CodexEntry) => void
  onUpdateEntry?: (entry: CodexEntry) => void
  onDeleteEntry?: (entryId: string) => void
}

type EntryType = 'character' | 'location'

export function CodexPanel({
  projectId,
  characters,
  locations,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}: CodexPanelProps) {
  const [activeTab, setActiveTab] = useState<EntryType>('character')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CodexEntry | null>(null)

  const entries = activeTab === 'character' ? characters : locations
  const typeLabel = activeTab === 'character' ? 'Персонаж' : 'Локация'

  const handleCreate = (entry: CodexEntry) => {
    onCreateEntry?.(entry)
    setShowForm(false)
    setEditingEntry(null)
  }

  const handleUpdate = (entry: CodexEntry) => {
    onUpdateEntry?.(entry)
    setShowForm(false)
    setEditingEntry(null)
  }

  const handleEdit = (entry: CodexEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingEntry(null)
  }

  return (
    <div className="codex-panel">
      <div className="codex-header">
        <h2>Кодекс</h2>
      </div>

      <div className="codex-tabs">
        <button
          className={`tab ${activeTab === 'character' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('character')
            setShowForm(false)
            setEditingEntry(null)
          }}
        >
          Персонажи ({characters.length})
        </button>
        <button
          className={`tab ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('location')
            setShowForm(false)
            setEditingEntry(null)
          }}
        >
          Локации ({locations.length})
        </button>
      </div>

      {showForm ? (
        <CodexForm
          projectId={projectId}
          type={activeTab}
          initialEntry={editingEntry || undefined}
          onSave={editingEntry ? handleUpdate : handleCreate}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <div className="codex-actions">
            <button
              className="btn-add"
              onClick={() => {
                setShowForm(true)
                setEditingEntry(null)
              }}
            >
              + Добавить {typeLabel}
            </button>
          </div>

          <CodexList
            entries={entries}
            type={activeTab}
            onEdit={handleEdit}
            onDelete={onDeleteEntry}
          />
        </>
      )}
    </div>
  )
}
