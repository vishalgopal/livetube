FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_ROLE=web
ENV RUN_MIGRATIONS=false

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

RUN mkdir -p /app/storage/uploads /app/storage/playlists /app/storage/logs

EXPOSE 3000

CMD ["sh", "./scripts/container-start.sh"]
