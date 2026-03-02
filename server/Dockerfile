FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY packages/mcp-servers/package.json ./packages/mcp-servers/
COPY packages/claude-code-wrapper/package.json ./packages/claude-code-wrapper/
RUN bun install --frozen-lockfile --production

FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run --filter @kg/shared build
RUN bun run --filter @kg/server build

FROM base AS runtime
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=install /app/node_modules ./node_modules
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY package.json ./

EXPOSE 4000
CMD ["bun", "run", "server/dist/main.js"]
