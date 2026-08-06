# Multi-stage build for Next.js 16 + Prisma + PostgreSQL

# ---- Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm config set cache /root/.npm --global \
  && npm config set prefer-offline true --global \
  && npm config set cache-max 86400000 --global
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client before copying the source, so this layer only
# invalidates when the schema changes (not on every code change)
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Build the application. The Turbopack filesystem cache lives in .next/cache,
# kept in a BuildKit cache mount so it survives between deploys.
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Tools + non-root user (single layer)
RUN apk add --no-cache curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# node_modules comes from `deps`, NOT from `builder`: its content is identical
# on every deploy, so this ~1GB layer stays cached instead of being copied and
# re-exported each time. Needed at runtime for the Prisma CLI (migrate deploy).
COPY --from=deps /app/node_modules ./node_modules

# Standalone output (includes its own traced node_modules, overlaid on top)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: schema + migrations + config + the client generated during the build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts

# Make entrypoint executable
RUN chmod +x /app/scripts/entrypoint.sh \
  && chown -R nextjs:nodejs /app/scripts

USER nextjs

EXPOSE 3000

# Use entrypoint script to run migrations + seed + start
CMD ["sh", "/app/scripts/entrypoint.sh"]
