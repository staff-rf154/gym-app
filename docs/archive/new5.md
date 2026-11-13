# New 5 — запуск контейнеров и инструкция

Дата: 2026-11-12
Запрос: «нужно запустить контейнеры, всё должно само запуститься; если что-то не так — исправить и написать инструкцию на запуск».

## Что запланировано

- Собрать и запустить `postgres`, `redis`, `backend`, `web-admin` через Docker Compose.
- Устранить причины падения при старте.
- Зафиксировать порядок запуска в README.

## Что сделано

- Диагностика: `docker compose config` валиден, порты 3000/8080/5432/6379 свободны.
- Первый `docker compose up -d --build` собрал образы и применил миграции, но `backend`
  упал с `Invalid environment configuration: POSTGRES_PASSWORD is required`.
- Причина: `backend/src/app.module.ts` требует `POSTGRES_PASSWORD` в env, а сервис
  `backend` в `docker-compose.yml` его не получал (передавался только `DATABASE_URL`).
- Исправление: в `docker-compose.yml` сервису `backend` добавлена переменная
  `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`.
- Повторный `docker compose up -d backend` — контейнер поднялся, Nest применил
  миграции и стартовал.
- README: раздел «Быстрый старт» заменён на пошаговый «Запуск (Docker)»
  (с нуля, проверка, диагностика, обязательный `make seed`), в таблицу env
  добавлен `REDIS_PASSWORD`.

## Проверки

- `docker compose ps` — 4 сервиса Up, postgres и redis healthy.
- `GET http://localhost:8080/api/v1/health` → `200 {"status":"ok"}`.
- `GET http://localhost:3000/` → `200`; `GET http://localhost:3000/api/v1/health` → `200`
  (проксирование nginx до backend работает).
- `POST /api/v1/auth/login` на пустой БД → `401` — ожидаемо, администратор ещё не создан.
- `/api/docs` → `404`, т.к. в docker-образе `NODE_ENV=production` (Swagger отключён).

## Результат

Контейнеры запускаются одной командой `make up`; миграции применяются автоматически.
Для входа в web-admin один раз выполняется `make seed`.
