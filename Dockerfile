# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY packages/mcp-servers/package.json ./packages/mcp-servers/
COPY packages/claude-code-wrapper/package.json ./packages/claude-code-wrapper/
RUN bun install --frozen-lockfile

# Stage 2: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .
RUN bun run build

# Stage 3: Production server
FROM oven/bun:1 AS production
WORKDIR /app
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/client/ui/dist ./client/ui/dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/knowledge-graph ./knowledge-graph
COPY --from=builder /app/server/agents ./server/agents
ENV NODE_ENV=production
EXPOSE 3001
CMD ["bun", "run", "server/dist/main.js"]
