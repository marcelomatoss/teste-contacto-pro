# ──────────────── Stage 1: build the Vite bundle ────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

# VITE_* envs are baked in at build time. The compose layer passes them
# through so the production bundle calls the right backend URL.
ARG VITE_API_URL=http://localhost:3001
ARG VITE_SOCKET_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ──────────────── Stage 2: serve via nginx ────────────────
FROM nginx:1.27-alpine AS runner

# nginx config tuned for SPA routing + WebSocket upgrade for Socket.IO
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the production bundle into the default nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

# Healthcheck so docker compose knows when the static server is ready
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5173/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
