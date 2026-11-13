# План 022 — завершение интеграции Redis

## Цель

Включить Redis в работу backend: распределённый rate-limit и кеш
справочников/отчётов с инвалидацией, не ломая запуск без Redis.

## Шаги

1. [x] `RedisService`: TTL-константы, `getOrSet`, пространство ключей
   (в тестах — изолированное на процесс).
2. [x] `RedisThrottlerStorage`: ключи с учётом namespace.
3. [x] `AppModule`: импорт `RedisModule`, `ThrottlerModule.forRootAsync`
   со storage из Redis.
4. [x] Кеш справочников: `GymsService`, `ExercisesService`,
   `FoodProductsService`, `GoalsService`.
5. [x] Кеш отчётов: `ReportsService`.
6. [x] Инвалидация кеша после успешных POST/PUT/PATCH/DELETE.
7. [x] Docker Compose: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   для backend.
8. [x] E2E: кеш справочника, инвалидация, ключи throttler в Redis.
9. [x] Сборка, тесты, `docs/022_tests`, `docs/readme.md`, `docs/022_result`.
