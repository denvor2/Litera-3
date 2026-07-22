import { useState } from 'react'
import { parseAttributes } from '../utils/parseAttributes'
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
          {entry.attributes ? (() => {
            const attrs = parseAttributes(entry.attributes)
            return attrs.description ? (
              <div className="tooltip-description">
                {String(attrs.description)}
              </div>
            ) : null
          })() : null}
        </div>
      )}
    </span>
  )
}
