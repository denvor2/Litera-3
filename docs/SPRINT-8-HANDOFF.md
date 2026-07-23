# Передача Фазы 0 Спринт 8 — новой сессии

## Статус
- **Sprint 8a**: ✅ Завершён и смерджен в main
- **Sprint 8b**: ✅ Завершён и смерджен в main  
- **Sprint 8c**: ✅ Завершён и смерджен в main
- **Sprint 8d**: 🚧 WIP — Заглушки компонентов, спека готова
- **Sprint 8e**: 🚧 WIP — Спека готова

## Что сделано в 8a–8c

### Sprint 8a — ManuscriptFlow (центр)
- Компонент непрерывного потока глав и сцен
- Expand/collapse главы и сцены
- Inline status select для каждой сцены
- Word count display
- Тумблеры Развернуть/Свернуть
- Все тесты 43/43 ✅

### Sprint 8b — AIPanel (правая панель)
- Интерактивная панель AI-помощников
- Выбор ролей (Соавтор/Редактор/Критик/Читатель)
- Выбор scope (Сцена/Глава/Диалог/Выделение)
- Message dialog с Enter to send, Shift+Enter for newline
- Loading state, mock response
- Все тесты 43/43 ✅

### Sprint 8c — Bottom bar
- Progress bar (условно на targetWordCount)
- Save status indicator (saved/saving/error dots)
- Extended Scene interface с targetWordCount field
- Все тесты 43/43 ✅

## Что нужно сделать в 8d–8e

### Sprint 8d — Карточки и zen mode (текущая сессия)
Заглушки созданы, нужна полная реализация:

1. **CodexCard** (`frontend/src/components/CodexCard.tsx`)
   - [x] Структура компонента
   - [ ] Динамические поля по типу (character/location/artifact/organization)
   - [ ] GET `/api/codex-entries/:id/mentions` для блока "Появляется в сценах"
   - [ ] Интеграция в App.tsx

2. **BookCard** (`frontend/src/components/BookCard.tsx`)
   - [x] Структура компонента
   - [ ] Привязка series field к Book type
   - [ ] Привязка genre field к Book type
   - [ ] Интеграция в App.tsx

3. **ProjectCard** (`frontend/src/components/ProjectCard.tsx`)
   - [x] Структура компонента
   - [ ] Интеграция в App.tsx

4. **Guide** (`frontend/src/components/Guide.tsx`)
   - [x] Структура компонента
   - [ ] Улучшенный markdown парсер (списки, таблицы и т.д.)
   - [ ] Интеграция в App.tsx

5. **Zen mode** (fullscreen)
   - [x] Toggle button в topbar (✓)
   - [ ] Интеграция в App.tsx (setZenMode)
   - [ ] CSS уже готов (`.app.zen-mode` скрывает панели)

6. **App.tsx интеграция**
   - [ ] Import всех карточек
   - [ ] centerView state переключение (manuscript | codex-card | book-card | project-card | guide)
   - [ ] Условный рендер в .center
   - [ ] zenMode state с toggle button

### Sprint 8e — Финальная верификация
1. Мобильный паттерн (list ↔ editor toggle) — заглушка или полная реализация
2. Floating Action Button для создания сцены
3. Bottom toolbar для форматирования
4. Все 39 пунктов UI-VERIFICATION-CHECKLIST.md пройдены
5. Дизайн совпадает с design/mockup/index.html
6. Мердж всех спринтов в main
7. Документ PHASE-0-COMPLETE.md

## Текущие ветки

- `main` (HEAD) — 8a–8c мерджены, готова к deploy
- `sprint/08d-cards-fullscreen-guide` — заглушки компонентов
- `sprint/08e-final-phase-0` — спека верификации

## Команды для следующей сессии

```bash
# Переключиться на 8d
git checkout sprint/08d-cards-fullscreen-guide

# После завершения 8d — мердж в main
git checkout main
git merge sprint/08d-cards-fullscreen-guide --no-ff -m "merge: спринт 8г завершён"

# Переключиться на 8e
git checkout sprint/08e-final-phase-0

# После завершения 8e — мердж в main
git checkout main
git merge sprint/08e-final-phase-0 --no-ff -m "merge: спринт 8д завершён"
```

## Важные файлы для справки

- `docs/UI-VERIFICATION-CHECKLIST.md` — что проверять
- `design/mockup/index.html` — точная спецификация дизайна
- `frontend/src/App.tsx` — главный файл интеграции
- `frontend/src/types.ts` — типы (Scene, Book, CodexEntry, Project)
- `docs/specs/08a-center-manuscript-flow.md` — архитектура centerView

## Тесты
Все 43 теста в `frontend/src/**/*.test.ts` и `backend/src/**/*.test.ts` должны проходить после каждого спринта.

```bash
# Запустить тесты
npm run test
```

## Заметка о режиме работы
Внутри спринта — no questions. Решения документируются в `docs/DECISIONS.md` если потребуется отклонение от спеки.
