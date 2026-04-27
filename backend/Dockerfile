FROM node:22-alpine

# Required by Prisma + Baileys (sharp etc)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3001

# Use tsx to run TypeScript directly — fewer steps, smaller image, fine for this scale.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx src/index.ts"]
