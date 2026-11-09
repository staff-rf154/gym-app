.PHONY: up down migrate seed logs test psql

up:
	docker compose up -d --build

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
