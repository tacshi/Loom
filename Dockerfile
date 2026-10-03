FROM node:24-alpine AS build
COPY --from=oven/bun:1.4.2-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun ci
COPY . .
RUN bun run build
FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
