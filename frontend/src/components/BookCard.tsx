import { useState } from 'react'
import type { Book } from '../types'
import './BookCard.css'

interface BookCardProps {
  book: Book
  onSave: (book: Book) => void
  onBack: () => void
}

const GENRES = [
  'Фантастика',
  'Фэнтези',
  'Детектив',
  'Романс',
  'Триллер',
  'Драма',
  'Научная фантастика',
  'Исторический роман',
]

export function BookCard({ book, onSave, onBack }: BookCardProps) {
  const [formData, setFormData] = useState(book)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="book-card">
      <div className="card-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>{book.title}</h2>
      </div>

      <div className="card-content">
        <div className="form-group">
          <label>Название</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Серия</label>
          <input
            type="text"
            placeholder="Название серии или отдельная книга"
            defaultValue=""
            // TODO: связать с series field
          />
        </div>

        <div className="form-group">
          <label>Жанр</label>
          <select defaultValue="">
            <option value="">Выберите жанр</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div className="card-actions">
          <button className="btn-secondary" onClick={onBack} disabled={saving}>
            Отмена
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
