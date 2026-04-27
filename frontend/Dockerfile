FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

ENV NODE_ENV=production
EXPOSE 5173

# Vite dev server is fine for this challenge (no SSR, no need for a separate static host)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
