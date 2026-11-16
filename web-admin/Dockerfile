# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY server-entrypoint.sh /usr/local/bin/server-entrypoint.sh
RUN chmod +x /usr/local/bin/server-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["/usr/local/bin/server-entrypoint.sh"]
