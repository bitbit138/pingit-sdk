# Build context is the monorepo root (see docker-compose.yml).
# Multi-stage: install + build the self-contained ESM bundle, then run it lean.
FROM node:22-alpine AS build
WORKDIR /repo

RUN corepack enable

# Workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/server/package.json packages/server/

RUN pnpm install --frozen-lockfile

# Sources.
COPY packages/contracts packages/contracts
COPY packages/server packages/server

# Contracts must be built before the server bundles it in.
RUN pnpm --filter @pingit/contracts build
RUN pnpm --filter @pingit/server build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Self-contained bundle (@pingit/contracts is bundled via noExternal) plus the
# CommonJS migrations the runtime applies on boot.
COPY --from=build /repo/packages/server/dist ./dist
COPY --from=build /repo/packages/server/migrations ./migrations

# Bundle still needs the runtime node_modules (pg, fastify, bcryptjs, ...).
COPY --from=build /repo/packages/server/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/server/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "dist/index.js"]
