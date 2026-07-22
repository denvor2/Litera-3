import { useState } from 'react'
import type { CodexEntry } from '../types'
import './EntityMention.css'

interface EntityMentionProps {
  entry: CodexEntry
}

export function EntityMention({ entry }: EntityMentionProps) {
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
          {entry.attributes && typeof entry.attributes === 'object' && 'description' in entry.attributes ? (
            <div className="tooltip-description">
              {String((entry.attributes as Record<string, any>).description)}
            </div>
          ) : null}
        </div>
      )}
    </span>
  )
}
