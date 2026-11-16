# 038 — Тесты: скорость, PDF-таблицы, бейджи, чат с ресепшеном

Дата: 2026-11-16

## Backend e2e

Команда (из `backend/`):

```bash
set -a; . /opt/compose/gym-app/.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
export REDIS_HOST=127.0.0.1
export NODE_ENV=test
pnpm test:e2e --runInBand --forceExit
```

Результат полного прогона:

- Suites: **34 passed, 34 total**
- Tests: **271 passed, 271 total**, failed 0, skipped 0
- Время: **52.640 s**
- Единственная ошибка в логе: `PushService FCM credentials not found ... push disabled`
  (ожидаемо без Firebase credentials).

### Новые проверки

- `backend/src/workouts/workouts-calendar.e2e-spec.ts` — 5 тестов:
  - клиентский календарь возвращает записи без `items`;
  - тренерский календарь работает с фильтрами;
  - перевёрнутый диапазон `from > to` → 400;
  - отсутствие `from`/`to` → 400;
  - полный `GET /client/workouts/:id` по-прежнему отдаёт упражнения.
- `backend/src/chats/chats-reception.e2e-spec.ts` — 6 тестов:
  - ресепшен видит список чатов;
  - `CLIENT_ADMIN` клиента направляется ресепшену его зала;
  - клиентское сообщение даёт `unreadCount = 1` у ресепшена;
  - клиент без зала получает ADMIN (fallback);
  - ресепшен не может создать чат с клиентом чужого зала (403 в обе стороны);
  - ресепшен создаёт `TRAINER_ADMIN` с тренером своего зала.

Точечный прогон новых тестов: **2 suites / 11 tests passed**.

## Mobile

```bash
cd mobile
flutter analyze
flutter test
```

- `flutter analyze` — **No issues found!**
- `flutter test` — **25 passed, 0 failed**.
- Обновлён `mobile/test/ui_smoke_test.dart`: fake API реализует
  `fetchCalendar`, поэтому M8 проверяет календарь через облегчённый ответ.

## Web-admin

```bash
cd web-admin
pnpm build
./node_modules/.bin/oxlint
```

- `pnpm build` — успешно.
- `oxlint` — без ошибок; остались ранее существовавшие предупреждения
  в `src/router.tsx` (fast refresh / set-state-in-effect).

## Примечания

- При первом полном прогоне падали два чужих набора:
  - `reception.e2e-spec.ts` — новый тест оставлял `TrainerGym` на зале
    с именем, совпадающим с префиксом чужого теста. Исправлено: уникальные
    имена залов `E2E Chat Reception Gym A/B` и очистка в `afterAll`.
  - `notifications.e2e-spec.ts` — общая очистка `test/setup-e2e.ts`
    удаляла уведомление «всем клиентам», если в БД оставались тестовые
    клиенты. После добавления `afterAll`-очистки новые тесты не оставляют
    данных; повторный полный прогон зелёный.
- Jest требует `--forceExit` (существующее поведение).

## Сборка и деплой

- Mobile: версия **1.0.9 (11)**; `apkanalyzer` подтвердил
  `version-name 1.0.9`, `version-code 11`.
- APK: `mobile/build/app/outputs/flutter-apk/app-release.apk` — 57.9 MiB,
  SHA-256 `e2bb60565b06b37b739863be866a09498937769044e89d7aa6092be7e9d0a861`.
- AAB: `mobile/build/app/outputs/bundle/release/app-release.aab` — 55.3 MiB,
  SHA-256 `7b9b205404022db2be872d428e33cd56ed788f4103479ece3529ca1350302f0b`.
- `docker compose up -d --build` — образы backend и web-admin пересобраны,
  контейнеры пересозданы. Оба контейнера **healthy**.
- `GET /api/v1/health` → `{"status":"ok"}`.
- `prisma migrate status` → `Database schema is up to date!`.
- web-admin отвечает **HTTP 200**.
- Дата деплоя: 2026-11-16 10:23 +07.
