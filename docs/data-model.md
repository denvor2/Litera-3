# Модель данных — LitStudio 2

Источник: ER-диаграмма, присланная автором (обсуждаема, это рабочая версия на старте Фазы 0). Ниже — та же схема, размеченная по фазам, чтобы Клод Код не создавал таблицы Фазы 2–3 в Фазе 0.

## Фаза 0 (MVP) — реализовать сейчас

```
PROJECT
  id            uuid PK
  title         string
  owner_id      uuid FK -> USER   -- решено: без логина в MVP, owner_id указывает на один фиксированный сид-USER, полноценный auth — Фаза 3 (см. COLLABORATOR)

USER
  id            uuid PK
  email         string
  name          string

BOOK
  id                uuid PK
  project_id        uuid FK -> PROJECT
  title             string
  order             int
  -- Не реализовано в Фазе 0, отложено на Фазу 2+:
  -- genre, synopsis, annotation, planned_volume, attributes

CHAPTER
  id            uuid PK
  book_id       uuid FK -> BOOK
  title         string
  order         int

SCENE
  id                uuid PK
  chapter_id        uuid FK -> CHAPTER
  title             string
  status            string   -- enum: draft | editing | done
  pov_character_id  uuid FK -> CODEXENTRY (nullable)
  word_count        int      -- вычисляемое поле, пересчитывается при сохранении текста
  body              string   -- JSON-сериализованный TipTap документ (SQLite несовместим с Json типом)
  notes             string   -- текстовые заметки/комментарии к сцене
  order             int
  -- Не реализовано в Фазе 0, отложено на Фазу 2+:
  -- target_word_count, deleted_at

CODEXENTRY
  id            uuid PK
  project_id    uuid FK -> PROJECT
  type          string   -- MVP: 'character' | 'location' только
  name          string
  attributes    string   -- JSON-сериализованные поля (внешность/характер для character, описание для location); гибкость json — точка расширения для Фазы 2; хранится как String для SQLite совместимости

SCENEENTITYLINK
  scene_id       uuid FK -> SCENE
  codex_entry_id uuid FK -> CODEXENTRY
  -- составной PK (scene_id, codex_entry_id)

VERSION
  id            uuid PK
  entity_type   string   -- MVP: только 'scene'
  entity_id     uuid
  scene_id      uuid FK -> SCENE
  snapshot      string   -- JSON-сериализованный TipTap документ на момент версии (String для SQLite)
  created_at    timestamp
```

**Мягкое удаление (Корзина).** Отложено на Фазу 2. BOOK, CHAPTER, SCENE, CODEXENTRY не имеют `deleted_at` в Фазе 0. Удаление элементов (кнопка 🗑) не реализовано; интерфейс показывает мёртвые кнопки удаления для будущей Фазы.

**Точки расширения, которые нужно оставить, но не реализовывать в Фазе 0:**
- `CODEXENTRY.type` — уже строка, а не enum в БД, чтобы Фаза 2 добавила новые типы без миграции схемы
- `CODEXENTRY.attributes` — уже json, добавление полей в Фазе 2 не требует ALTER TABLE
- `PROJECT` = Серия. Содержит одну или несколько `BOOK` — многокнижность серии входит в Фазу 0, не отложена. `CODEXENTRY` привязана к `project_id`, а не к `book_id`, — Кодекс общий на всю серию, персонажи/локации переиспользуются между книгами одной серии

## Фаза 2 — добавить

```
RELATIONSHIP        -- граф отношений персонажей
  id, from_entry_id, to_entry_id, type

PLOTARC / PLOTCARD  -- доска сюжета
  PLOTARC: id, project_id, title
  PLOTCARD: id, arc_id, scene_id

TIMELINEEVENT       -- таймлайн
  id, project_id, title, date_or_position, linked_scene_ids, linked_entity_ids

GOAL                 -- цели и статистика
  id, project_id, type (daily|weekly|deadline), target_value, due_date

AIEXPERTROLE          -- AI-эксперты
  id, project_id, name, prompt_instruction, quick_queries (json)

COMMENT               -- комментарии (от AI-эксперта или живого редактора)
  id, scene_id, author_id (nullable — если от AI, author_id null + expert_role_id), text

BEAT                   -- если понадобится трекинг темпа внутри сцены
  id, scene_id, order, summary
```

Также в Фазе 2: `SCENE.body` может потребовать выноса в отдельную таблицу с историей правок построчно — не решать заранее, смотреть по факту нагрузки.

## Фаза 3 — добавить

```
COLLABORATOR   -- роль пользователя в проекте (владелец/редактор/комментатор/читатель)
  id, project_id, user_id, role

-- CRDT-состояние сцены хранится отдельно от VERSION (VERSION остаётся снапшотами для отката,
-- CRDT — это Yjs-документ для живой синхронизации; их нельзя путать в одной таблице)
```

## Правило на все фазы
Любое изменение схемы — сначала правка этого файла, потом миграция. Архитектор на ревью (см. DOD.md, пункт 1) сверяет код именно с этим файлом, не с исходной картинкой.
