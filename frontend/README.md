# LitStudio 2 Frontend

Frontend для LitStudio 2 на React + TypeScript + Vite + TipTap.

## Требования

- Node.js 18+
- npm или yarn

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5173`.

## Сборка

```bash
npm run build
```

## Тестирование

```bash
npm test
```

## Структура проекта

```
src/
  components/       - React компоненты
  utils/           - утилиты (подсчет слов и т.д.)
  types.ts         - TypeScript типы
  main.tsx         - входная точка
  App.tsx          - основной компонент
```

## Компоненты

- `ManuscriptEditor` - основной редактор рукописи
- `SceneEditor` - редактор отдельной сцены (с TipTap)
- `Sidebar` - боковая панель с навигацией
