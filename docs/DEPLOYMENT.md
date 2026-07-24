# Деплой LitStudio 3 на Timeweb

## ⚠️ ВАЖНО: ЗАЩИТА ДАННЫХ

**ВНИМАНИЕ: После первого деплоя на продакшене удаление БД или очистка данных приведет к потере всех рабочих данных пользователей!**

- ❌ НЕ удаляйте базу данных после запуска
- ❌ НЕ запускайте скрипты очистки (cleanup.sql)
- ❌ НЕ сбрасывайте миграции Prisma
- ✅ Резервные копии БД должны создаваться автоматически

---

## 📋 Пошаговая инструкция

### Этап 1: Подготовка на Timeweb (5 минут)

1. **Зайти на https://timeweb.cloud**
2. **Купить тариф Node.js Standard (2GB+ RAM)**
   - Выбрать ОС: Linux (Ubuntu 20.04 или новее)
   - Включить PostgreSQL в заказ (или отдельно)
3. **После активации:**
   - Получить доступ по SSH (пароль придет на почту)
   - Запомнить IP адрес сервера
   - Запомнить пароли от postgres, FTP/SSH

### Этап 2: Подготовка переменных окружения (5 минут)

4. **На локальной машине создать `.env.production`:**
   ```env
   DATABASE_URL=postgresql://litstudio:YOUR_DB_PASSWORD@localhost:5432/litstudio
   JWT_SECRET=YOUR_SECRET_KEY_MIN_32_CHARS_RANDOM_STRING_HERE
   NODE_ENV=production
   ```
   
   Где:
   - `YOUR_DB_PASSWORD` = пароль от postgres с Timeweb
   - `YOUR_SECRET_KEY_...` = любая длинная случайная строка (мин 32 символа)

### Этап 3: Подготовка кода (10 минут)

5. **Убедиться что Git чистый:**
   ```bash
   git status  # Должно быть пусто или только .env.production
   ```

6. **Мержим спринт 11 в main (если еще не сделали):**
   ```bash
   git checkout main
   git merge sprint/11-auth-integration
   git push origin main
   ```

### Этап 4: Деплой (выбрать ОДН способ)

#### Способ A: Docker (рекомендуется)

7. **На Timeweb (через SSH):**
   ```bash
   mkdir -p /home/litstudio
   cd /home/litstudio
   git clone https://github.com/YOUR_REPO/litstudio.git .
   cp .env.production .env
   
   # Создать БД (один раз)
   psql -U postgres -c "CREATE DATABASE litstudio;"
   psql -U postgres -c "CREATE USER litstudio WITH PASSWORD 'YOUR_DB_PASSWORD';"
   psql -U postgres -c "ALTER ROLE litstudio WITH LOGIN;"
   psql -U postgres -d litstudio -c "GRANT ALL PRIVILEGES ON DATABASE litstudio TO litstudio;"
   ```

8. **Выстроить Docker контейнер:**
   ```bash
   docker build -t litstudio:latest .
   docker run -d \
     --name litstudio-prod \
     -p 3800:3800 \
     --env-file .env \
     -e DATABASE_URL="postgresql://litstudio:YOUR_DB_PASSWORD@host.docker.internal:5432/litstudio" \
     litstudio:latest
   ```

9. **Проверить логи:**
   ```bash
   docker logs litstudio-prod
   ```

#### Способ B: Manual (без Docker)

7. **На Timeweb (через SSH):**
   ```bash
   cd /home/litstudio
   git clone https://github.com/YOUR_REPO/litstudio.git .
   
   # Установить зависимости
   cd backend && npm ci --omit=dev
   cd ../frontend && npm ci
   npm run build
   
   # Создать БД
   psql -U postgres -c "CREATE DATABASE litstudio;"
   psql -U postgres -c "CREATE USER litstudio WITH PASSWORD 'YOUR_DB_PASSWORD';"
   psql -U postgres -d litstudio -c "GRANT ALL PRIVILEGES ON DATABASE litstudio TO litstudio;"
   
   # Миграции
   cd backend
   npx prisma migrate deploy
   
   # Запустить (в screen или systemd)
   screen -S litstudio
   npm start
   # Ctrl+A+D для выхода из screen
   ```

### Этап 5: Настройка домена (10 минут)

10. **В панели Timeweb:**
    - Привязать домен к IP сервера
    - Настроить SSL (Let's Encrypt - обычно автоматически)
    - Указать A запись: `your-domain.com → IP_СЕРВЕРА`

11. **Обновить API_BASE в frontend (если нужно):**
    - Если фронтенд и бэк на одном домене - ничего не менять
    - Если разные домены - обновить в `frontend/src/config.ts`

### Этап 6: Проверка (5 минут)

12. **Проверить что всё работает:**
    ```bash
    # На локальной машине
    curl https://your-domain.com/api/health
    # Должно вернуть 200 или 404 (но не 5xx)
    
    # Открыть в браузере
    https://your-domain.com
    # Должен загрузиться фронтенд
    ```

13. **Проверить логин:**
    - Кликнуть иконку 🔑 в правом верхнем углу
    - Ввести: `denvor2@gmail.com / Denvor127`
    - Должен авторизоваться

---

## 🔄 Обновление кода (после изменений)

```bash
# На Timeweb (SSH)
cd /home/litstudio
git pull origin main
npm run build  # или docker build
systemctl restart litstudio  # если используешь systemd
```

---

## ⚠️ ВАЖНЫЕ НАПОМИНАНИЯ

1. **БД - святое святых:**
   - После деплоя - никогда не удаляй БД
   - Не запускай cleanup.sql на продакшене
   - Не сбрасывай миграции

2. **Резервные копии:**
   - Включить автоматические бэкапы в панели Timeweb
   - Хранить копии на отдельном сервисе (Yandex.Cloud, AWS и т.д.)

3. **Мониторинг:**
   - Проверяй логи: `docker logs litstudio-prod` или `tail -f /var/log/litstudio.log`
   - Есть ошибки вроде "disk full" - очистить старые логи

---

## 📞 Помощь

Если что-то не работает:
1. Проверь логи приложения
2. Проверь переменные окружения (`.env`)
3. Проверь доступ к БД: `psql -U litstudio -d litstudio -h localhost`
4. Перезагрузи контейнер: `docker restart litstudio-prod`
