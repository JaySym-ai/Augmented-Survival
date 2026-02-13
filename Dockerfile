# Stage 1 — Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY packages/game-web/package.json packages/game-web/
COPY apps/desktop/package.json apps/desktop/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY assets/ assets/
RUN npm run build:web

# Stage 2 — Serve
FROM nginx:alpine
COPY --from=build /app/packages/game-web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
