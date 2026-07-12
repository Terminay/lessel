# ============================================================================
# lessel Plugin Registry — Dockerfile
# Self-hosted community plugin registry for lessel.
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npx tsc

# ── Production image ───────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -S lessel && adduser -S lessel -G lessel

COPY --from=builder /app/dist ./dist
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev && \
    mkdir -p /app/registry-data/plugins && \
    chown -R lessel:lessel /app

EXPOSE 3456

USER lessel

ENV REGISTRY_PORT=3456
ENV REGISTRY_DATA_DIR=/app/registry-data

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3456/health || exit 1

CMD ["node", "dist/index.js"]