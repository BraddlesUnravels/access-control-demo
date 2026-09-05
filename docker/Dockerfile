# chainguard have images designed to have 0 vulnerabilites
FROM cgr.dev/chainguard/node:latest-dev AS dependencies

USER root
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM cgr.dev/chainguard/node:latest-dev AS builder

USER root
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public

RUN npm run build

FROM cgr.dev/chainguard/node:latest AS runner

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
    CMD ["/usr/bin/node", "-e", "fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(4000) }).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

# Chainguard already defines ENTRYPOINT ["/usr/bin/node"].
# Supplying only the script produces: /usr/bin/node server.js
CMD ["server.js"]