# LitStudio 2

Инструмент для написания и редактирования художественных текстов с поддержкой иерархической организации, персонажей и локаций.

## Структура проекта

```
/frontend   - React + TypeScript + Vite + TipTap приложение
/backend    - Node.js + Fastify + Prisma API
/docs       - спецификации, модель данных, документация
```

## Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/denvor2/Litera-3.git
cd Litera-3
```

### 2. Установить зависимости

```bash
# Backend
cd backend
npm install

# Frontend (в отдельной папке)
cd ../frontend
npm install
```

### 3. Настроить переменные окружения

#### Backend

Скопируйте `.env.example` и установите DATABASE_URL:

```bash
cd backend
cp .env.example .env
# Отредактируйте .env с подходящими значениями
```

#### Frontend

Frontend использует прокси для API, настроенный в `vite.config.ts`.

### 4. Инициализировать базу данных

```bash
cd backend
npm run db:generate
npm run db:migrate:dev
npm run db:seed
```

### 5. Запустить приложение

```bash
# Терминал 1 - Backend
cd backend
npm run dev

# Терминал 2 - Frontend
cd frontend
npm run dev
```

Приложение будет доступно на `http://localhost:5173`.

## Документация

- [Спецификации модулей](docs/specs/00-overview.md)
- [Фазы проекта](docs/PHASES.md)
- [Модель данных](docs/data-model.md)
- [Definition of Done](docs/DOD.md)
- [Решения](docs/DECISIONS.md)

## Разработка

### Тестирование

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Сборка

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## Стек технологий

### Frontend
- React 18
- TypeScript
- Vite
- TipTap (редактор)
- Vitest (тестирование)

### Backend
- Fastify
- Prisma ORM
- PostgreSQL
- Vitest (тестирование)

## Фазы разработки

- **Фаза 0 (MVP)**: Базовый редактор рукописи с персонажами и локациями
- **Фаза 1**: Деплой и укрепление
- **Фаза 2**: Инструменты писателя (доска сюжета, таймлайн, AI)
- **Фаза 3**: Мультиплатформенность и синхронизация

## Лицензия

MIT
