FROM node:20-alpine AS base

# Install deps only when package.json changes — cached layer
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Minimal runtime: standalone output + only prisma's node_modules
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js standalone (self-contained server.js with bundled deps)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma runtime files (needed for migrate deploy + query engine)
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Files needed by one-off scripts run from docker-entrypoint
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib/email-builder.ts ./lib/email-builder.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/public/logos /app/public/programas /app/public/uploads /app/public/productos \
    && chown -R nextjs:nodejs /app/public/logos /app/public/programas /app/public/uploads /app/public/productos

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
