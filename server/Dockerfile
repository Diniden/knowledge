# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy workspace manifests (for bun install)
COPY package.json bun.lock* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY packages/mcp-servers/package.json ./packages/mcp-servers/
COPY packages/claude-code-wrapper/package.json ./packages/claude-code-wrapper/

RUN bun install --frozen-lockfile

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY tsconfig.base.json tsconfig.json ./
COPY shared ./shared
COPY server ./server
COPY packages ./packages

# Build shared first, then server
RUN cd shared && bun run build
RUN cd server && bun run build

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM oven/bun:1-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY server/package.json ./server/

EXPOSE 4000

CMD ["bun", "run", "server/dist/main.js"]
