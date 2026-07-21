import { useState } from 'react'
import type { CodexEntry } from '../types'
import './EntityMention.css'

interface EntityMentionProps {
  entry: CodexEntry
  position?: { x: number; y: number }
}

export function EntityMention({ entry, position }: EntityMentionProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const typeLabel = {
    character: 'Персонаж',
    location: 'Локация',
  }

  return (
    <span
      className="entity-mention"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {entry.name}
      {showTooltip && (
        <div className="entity-tooltip">
          <div className="tooltip-name">{entry.name}</div>
          <div className="tooltip-type">{typeLabel[entry.type as keyof typeof typeLabel]}</div>
          {entry.attributes && typeof entry.attributes === 'object' && 'description' in entry.attributes && (
            <div className="tooltip-description">
              {(entry.attributes as Record<string, unknown>).description}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
