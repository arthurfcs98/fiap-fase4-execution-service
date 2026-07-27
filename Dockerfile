FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY src ./src
COPY tsconfig*.json nest-cli.json ./
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS production
LABEL org.opencontainers.image.title="Execution Service"
LABEL org.opencontainers.image.description="Fase 4 Tech Challenge FIAP - Timeline de execução (MongoDB)"
LABEL org.opencontainers.image.source="https://github.com/arthurfcs98/fiap-fase4-execution-service"

WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=builder /app/dist ./dist
RUN chown -R nestjs:nodejs /app
USER nestjs

ENV NODE_ENV=production
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/api/health || exit 1

CMD ["node", "dist/main"]
