# LitStudio 2 Backend

Backend для LitStudio 2 на Node.js + Fastify + Prisma + PostgreSQL.

## Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

## Установка

```bash
npm install
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и установите подходящие значения:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/litstudio"
NODE_ENV="development"
PORT=3000
```

## Миграции БД

```bash
# Запустить миграции
npm run db:migrate:deploy

# Создать миграцию
npm run db:migrate:dev

# Сгенерировать Prisma Client
npm run db:generate
```

## Разработка

```bash
npm run dev
```

Сервер будет доступен на `http://localhost:3000`.

## Тестирование

```bash
npm test
```

## Сборка

```bash
npm run build
npm start
```

## API

Основные эндпоинты:

- `GET /health` - проверка здоровья сервера
- `GET /api/projects` - получить все проекты
- `POST /api/projects` - создать новый проект
