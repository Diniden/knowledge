# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock* ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/

RUN bun install --frozen-lockfile

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

COPY tsconfig.base.json tsconfig.json ./
COPY shared ./shared
COPY client ./client

ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_APP_NAME

# Build shared first, then client
RUN cd shared && bun run build
RUN cd client && bun run build

# =============================================================================
# Stage 3: Serve with nginx
# =============================================================================
FROM nginx:alpine AS runtime

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
