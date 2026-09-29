FROM node:22-slim AS base
COPY --from=oven/bun:1.3.11 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./

FROM base AS build
RUN bun ci
COPY . .
RUN bun run build && rm -rf .next/cache

FROM base AS deps
RUN bun ci --production && rm -rf node_modules/@next/swc-*-musl node_modules/@img/*linuxmusl*

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.ts server.mjs ./
EXPOSE 3001 3002
CMD ["node", "server.mjs"]
