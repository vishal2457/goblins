# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat tini
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4005

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

COPY --from=prod-deps --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=expressjs:nodejs /app/dist ./dist
COPY --from=build --chown=expressjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=expressjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

USER expressjs

EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4005/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
