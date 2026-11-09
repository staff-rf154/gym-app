FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
RUN npm_config_build_from_source=true pnpm rebuild bcrypt

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM node:20-alpine AS runtime
RUN npm install -g pnpm@9
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/jest.config.js ./jest.config.js
COPY --from=build /app/src ./src
EXPOSE 8080
CMD ["node", "dist/src/main.js"]
