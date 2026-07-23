# Спринт 8г — Карточки и полноэкранный режим

## Задача
Реализовать компоненты для отображения карточек (Кодекс, Книга, Проект) в центральной зоне, а также включить полноэкранный (zen) режим скрытия боковых панелей.

## Компоненты

### 1. CodexCard (Карточка Кодекса)
**Файл:** `frontend/src/components/CodexCard.tsx`

**Props:**
```typescript
interface CodexCardProps {
  entry: CodexEntry
  onSave: (entry: CodexEntry) => void
  onBack: () => void
}
```

**Поведение:**
- Заголовок с кнопкой «← Назад»
- Редактируемые поля:
  - Название (title)
  - Для персонажа: внешность, характер, цель
  - Для локации: описание
- Блок «Появляется в сценах»: список сцен с ссылками на упоминания
- Кнопки: Сохранить, Отмена
- Клик на сцену в списке → развернуть рукопись, скролл, подсветка

### 2. BookCard (Карточка Книги)
**Файл:** `frontend/src/components/BookCard.tsx`

**Props:**
```typescript
interface BookCardProps {
  book: Book
  onSave: (book: Book) => void
  onBack: () => void
}
```

**Поля:**
- Название (title)
- Серия (series dropdown) — список серий из проекта или текст
- Жанр (genre dropdown) — список жанров или текст

### 3. ProjectCard (Карточка Проекта)
**Файл:** `frontend/src/components/ProjectCard.tsx`

**Props:**
```typescript
interface ProjectCardProps {
  project: Project
  onSave: (project: Project) => void
  onBack: () => void
}
```

**Поля:**
- Название (title)
- Описание (description textarea)

### 4. Guide (Гайд/справка)
**Файл:** `frontend/src/components/Guide.tsx`

**Props:**
```typescript
interface GuideProps {
  content: string // markdown
  onBack: () => void
}
```

**Поведение:**
- Markdown-рендер содержимого в HTML
- Кнопка «← Назад»

## Полноэкранный (zen) режим
- Toggle button в topbar: `⛺` (в zen mode) / `⛔` (выход)
- Скрывает левый и правый сайдбары (уже реализовано в CSS `.app.zen-mode`)
- State: `zenMode` в App.tsx (boolean)
- Button click: `setZenMode(!zenMode)`

## Интеграция в App.tsx
- Условный рендер в `.center` в зависимости от `centerView`:
  - `'manuscript'` → ManuscriptFlow
  - `'codex-card'` → CodexCard
  - `'book-card'` → BookCard
  - `'project-card'` → ProjectCard
  - `'guide'` → Guide

## Тестирование
1. Полноэкранный режим: клик toggle → скрыты панели
2. Выход из zen mode: клик toggle → видны панели
3. Каждая карточка: отмена → назад без сохранения, сохранить → PUT + обновление + назад

## Файлы для изменения
- `frontend/src/components/CodexCard.tsx` (NEW)
- `frontend/src/components/BookCard.tsx` (NEW)
- `frontend/src/components/ProjectCard.tsx` (NEW)
- `frontend/src/components/Guide.tsx` (NEW)
- `frontend/src/App.tsx` — интеграция + zenMode toggle
- `frontend/src/App.css` — стили для карточек и toggle button
