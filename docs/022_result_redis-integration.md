# Результат 022 — интеграция Redis

## Статус

Выполнено.

## Что сделано

- `RedisModule` подключён в `AppModule`; `ThrottlerModule` переведён
  на `RedisThrottlerStorage` через `forRootAsync`.
- `RedisService`: `getOrSet`, TTL-константы (справочники 300 с,
  отчёты 60 с), namespace ключей (`REDIS_KEY_PREFIX`, в тестах —
  уникальный на процесс).
- `RedisThrottlerStorage`: ключи с namespace, in-memory fallback при
  недоступном Redis.
- Кеш справочников: залы, упражнения (с учётом фильтров), продукты,
  цели (`findAll`/`findActive`).
- Кеш отчётов: динамика веса, прогресс, сводка упражнений,
  посещаемость, оборудование, тренеры.
- Глобальный `CacheInvalidationInterceptor`: после успешных
  POST/PUT/PATCH/DELETE сбрасывает связанные префиксы; демо-операции —
  все справочники и отчёты.
- Docker Compose: backend получает `REDIS_HOST`, `REDIS_PORT`,
  `REDIS_PASSWORD`.
- E2E `backend/src/redis/redis.e2e-spec.ts` — 3 теста.
- Исправлен bug 1 (вход тренера без профиля) — `docs/bug1.md`.

## Изменённые файлы

- `backend/src/app.module.ts`
- `backend/src/redis/redis.service.ts`
- `backend/src/redis/redis-throttler.storage.ts`
- `backend/src/redis/cache-invalidation.interceptor.ts` (новый)
- `backend/src/redis/redis.e2e-spec.ts` (новый)
- `backend/src/gyms/gyms.service.ts`
- `backend/src/exercises/exercises.service.ts`
- `backend/src/food-products/food-products.service.ts`
- `backend/src/goals/goals.service.ts`
- `backend/src/reports/reports.service.ts`
- `backend/src/auth/auth.service.ts` (bug 1)
- `docker-compose.yml`
- `docs/022_task_redis-integration.md`, `docs/022_plan_redis-integration.md`
- `docs/022_tests_redis-integration.md`, `docs/022_result_redis-integration.md`
- `docs/readme.md`, `docs/bug1.md`

## Тесты

`docs/022_tests_redis-integration.md`: `pnpm build` — успешно;
`pnpm test:e2e` — 26 suites, 201 tests passed, 0 failed.

## Отклонения от плана

- Инвалидация реализована централизованным HTTP-interceptor, а не
  вызовами в каждом сервисе: так покрываются и прямые операции
  демо-модуля, и все изменяющие эндпоинты.
- Кеш хранит JSON: `Date` в отчётах при чтении из кеша становится
  ISO-строкой, что совпадает с HTTP-представлением.

## Эксплуатация

Для применения изменений в Docker Compose требуется пересборка backend:
`docker compose up -d --build backend`.
