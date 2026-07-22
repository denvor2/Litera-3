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

  const attrs = (entry.attributes || {}) as Record<string, string>
  const description = attrs.description || ''

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
          {description && (
            <div className="tooltip-description">
              {description}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
