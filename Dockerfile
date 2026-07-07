FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json ./
COPY packages/core/package.json packages/core/
COPY packages/listener-discord/package.json packages/listener-discord/

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY packages/core/src/ packages/core/src/
COPY packages/core/tsconfig.json packages/core/
COPY packages/listener-discord/src/ packages/listener-discord/src/
COPY packages/listener-discord/tsconfig.json packages/listener-discord/

# Build both packages
RUN npm run build

# ── Production image ─────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Copy only production artifacts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/core/package.json packages/core/
COPY --from=builder /app/packages/listener-discord/package.json packages/listener-discord/
COPY --from=builder /app/packages/core/dist/ packages/core/dist/
COPY --from=builder /app/packages/listener-discord/dist/ packages/listener-discord/dist/

# Install production-only dependencies
RUN npm ci --production --workspaces

# Copy runtime files
COPY lessel.config.json ./
COPY .env.example ./.env

# Create data directory
RUN mkdir -p data

EXPOSE 3100

CMD ["node", "packages/listener-discord/dist/app.js"]