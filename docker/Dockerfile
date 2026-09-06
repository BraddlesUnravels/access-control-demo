FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS dependencies

USER root
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder

USER root
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max_old_space_size=1024

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public

RUN npm run build

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner

WORKDIR /app

ARG SOURCE_REPOSITORY=""

LABEL org.opencontainers.image.source=${SOURCE_REPOSITORY}

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder \
    --chown=node:node \
    /app/public \
    ./public

COPY --from=builder \
    --chown=node:node \
    /app/.next/standalone \
    ./

COPY --from=builder \
    --chown=node:node \
    /app/.next/static \
    ./.next/static

USER node

EXPOSE 3000

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=15s \
    --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(4000) }).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "server.js"]