FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# Valeurs fictives utilisées uniquement pendant la compilation.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1

RUN ./node_modules/.bin/prisma generate
RUN BETTER_AUTH_SECRET=build-only-placeholder-not-a-real-secret BETTER_AUTH_URL=http://localhost:3000 npm run build


FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app /app

RUN chmod 755 /app/docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
