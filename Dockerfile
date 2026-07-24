# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma

# Copy frontend
COPY frontend/package*.json ./frontend/
COPY frontend/index.html ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public

# Install and build
RUN cd backend && npm ci
RUN cd frontend && npm ci && npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Install production dependencies only
RUN cd backend && npm ci --omit=dev

# Prisma
RUN cd backend && npx prisma generate

EXPOSE 3800

ENV NODE_ENV=production

# Run migrations and start server
CMD cd backend && npx prisma migrate deploy && npm start
