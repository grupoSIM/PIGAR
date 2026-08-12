FROM node:24.15.0-alpine

WORKDIR /workspace

# Corepack bundled with Node 24.15 can fail while loading pnpm 11.9.0 inside
# Alpine images. Install the version pinned by package.json explicitly so every
# image build uses the same package manager as local and CI.
RUN npm install --global pnpm@11.9.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm build

CMD ["node", "apps/api/dist/index.js"]
