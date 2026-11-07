FROM node:24.22.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
RUN npm run build

FROM node:24.22.0-alpine

WORKDIR /app
ENV NODE_ENV=production \
    GAME_SERVER_PORT=7420 \
    DATABASE_PATH=/data/containment.sqlite \
    CLIENT_DIST_PATH=/app/packages/client/dist

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci --omit=dev && npm cache clean --force

COPY packages/shared/src packages/shared/src
COPY packages/server/src packages/server/src
COPY --from=build /app/packages/client/dist packages/client/dist

RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 7420
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:7420/ > /dev/null || exit 1
CMD ["node", "--no-warnings=ExperimentalWarning", "packages/server/src/main.ts"]
