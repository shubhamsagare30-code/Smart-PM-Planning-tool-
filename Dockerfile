FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/src/database/migrations ./dist/database/migrations

COPY --from=frontend-build /app/frontend/dist ./public

RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=./data/capacity.db
ENV CORS_ORIGIN=http://localhost:3001

EXPOSE 3001

CMD ["sh", "-c", "node dist/database/cli.js migrate && node dist/database/cli.js seed; node dist/index.js"]
