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
  'Магический реализм',
  'Young Adult',
  'New Adult',
  'Женская проза',
  'Нон-фикшен',
  'Автофикшен',
  'Научно-популярная литература',
]

export function BookCard({ book, onSave, onBack }: BookCardProps) {
  const bookData = book as any
  const [formData, setFormData] = useState<any>({
    ...book,
    genre: bookData.genre || '',
    description: bookData.description || '',
    synopsis: bookData.synopsis || '',
    plannedCharCount: bookData.plannedCharCount || '',
    plannedAuthorSheets: bookData.plannedAuthorSheets || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData as Book)
      onBack()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="book-card">
      <div className="card-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
      </div>

      <div className="card-content">
        <div className="head" style={{ marginBottom: '20px' }}>
          <h2>Настройки книги</h2>
          <div className="subtitle">{book.title}</div>
        </div>

        <div className="form-group">
          <label>Название</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bc-input"
          />
        </div>

        <div className="form-group">
          <label>Серия</label>
          <input
            type="text"
            value={formData.series}
            onChange={(e) => setFormData({ ...formData, series: e.target.value })}
            placeholder="Название серии или отдельная книга"
            className="bc-input"
          />
        </div>

        <div className="form-group">
          <label>Жанр</label>
          <select
            value={formData.genre}
            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            className="bc-select"
          >
            <option value="">Выберите жанр</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Синопсис</label>
          <textarea
            value={formData.synopsis}
            onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
            placeholder="Краткое описание сюжета"
            rows={4}
            className="bc-textarea"
          />
        </div>

        <div className="form-group">
          <label>Описание / Аннотация</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Полное описание для читателя"
            rows={4}
            className="bc-textarea"
          />
        </div>

        <div className="form-group">
          <label>Плановый объём (символы)</label>
          <input
            type="number"
            value={formData.plannedCharCount}
            onChange={(e) => setFormData({ ...formData, plannedCharCount: e.target.value ? parseInt(e.target.value) : '' })}
            placeholder="Например: 120000"
            className="bc-input"
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Плановый объём (авт. листы)</label>
          <input
            type="number"
            value={formData.plannedAuthorSheets}
            onChange={(e) => setFormData({ ...formData, plannedAuthorSheets: e.target.value ? parseInt(e.target.value) : '' })}
            placeholder="Например: 3 (= 120000 знаков)"
            className="bc-input"
            min="0"
            step="0.25"
          />
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
