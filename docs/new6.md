# New 6 — автоматический seed при развёртывании

Дата: 2026-11-12
Запрос: «убери с инструкции проекта запрет запуска seed, запусти make seed и настрой,
чтобы он запускался автоматически при развёртывании проекта».

## Что сделано

- `AGENTS.md`: пункт 5 «Не запускай миграции и seed — это делает человек» заменён на
  «Миграции и seed применяются автоматически при старте backend в Docker Compose;
  вручную — `make migrate` и `make seed`».
- `docker-compose.yml`: команда сервиса `backend` теперь выполняет
  `prisma migrate deploy && prisma db seed && node dist/src/main.js`.
  В PATH добавлен `/app/node_modules/.bin`, иначе `prisma db seed` падал с
  `Error: Command failed with ENOENT: ts-node prisma/seed.ts`.
- `README.md`: seed больше не отдельный обязательный шаг, описан как автоматический;
  добавлены прямые команды на случай отсутствия `make`.
- Seed идемпотентен (`upsert` по `phone`), поэтому выполняется при каждом старте
  и обновляет администратора из `.env`.

## Проверки

- `docker compose up -d --force-recreate backend` → в логах:
  `Running seed command ts-node prisma/seed.ts ...` и
  `The seed command has been executed.`
- `docker compose exec -T backend npx prisma db seed` → успешно (ручной запуск).
- `POST /api/v1/auth/login` с `ADMIN_PHONE`/`ADMIN_PASSWORD` из `.env` → `200`,
  токены `ADMIN` выданы.
- `GET /api/v1/health` → `200`.
- В окружении отсутствует `make`; выполнены эквивалентные `docker compose` команды,
  это отражено в README.

## Результат

Чистое развёртывание (`docker compose up -d --build`) само применяет миграции и
создаёт администратора; дополнительных ручных шагов не требуется.
