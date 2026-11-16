.PHONY: up down migrate seed logs test psql apply-server

WEB_ADMIN_PORT ?= $(shell sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' server-config/server-settings.json 2>/dev/null | head -n 1)
export WEB_ADMIN_PORT

up:
	docker compose up -d --build

apply-server:
	docker compose up -d --force-recreate web-admin

down:
	docker compose down

migrate:
	docker compose exec backend npx prisma migrate deploy

seed:
	docker compose exec backend npx prisma db seed

logs:
	docker compose logs -f backend

test:
	docker compose exec backend pnpm test:e2e

psql:
	docker compose exec postgres psql -U gym gym
