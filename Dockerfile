# Monorepo backend — production image for Railway, Render, or any Docker host.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ libvips-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Workspace manifests (lockfile lives at repo root)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY admin-ui/package.json ./admin-ui/

RUN npm ci

COPY backend ./backend

RUN npm run build -w backend

WORKDIR /app/backend

ENV NODE_ENV=production

EXPOSE 8055

CMD ["npm", "run", "start:prod"]
