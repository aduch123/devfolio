FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend ./backend
COPY frontend ./frontend
RUN cd backend && DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

FROM build AS migrate
WORKDIR /app/backend
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS runtime
RUN cd backend && npm prune --omit=dev && mkdir -p /data/uploads && chown -R node:node /data /app
ENV NODE_ENV=production PORT=5000 UPLOAD_DIR=/data/uploads
USER node
WORKDIR /app/backend
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
