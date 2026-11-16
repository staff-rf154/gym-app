# 037 — Тесты: изоляция данных, чаты, PDF, нижнее меню

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

- Suites: **32 passed, 32 total**
- Tests: **260 passed, 260 total**, failed 0, skipped 0
- Время: **51.428 s**
- Лог: `/tmp/gym-e2e-final.log`
- Единственная ошибка в логе: `PushService FCM credentials not found ... push disabled`
  (ожидаемо без Firebase credentials).

### Новые и изменённые проверки

- `backend/src/reports/isolation.e2e-spec.ts` — 12 тестов:
  - тренер A/B видит только свои замеры веса, упражнения и питание;
  - клиент видит данные обоих тренеров;
  - RECEPTION экспортирует PDF только по клиенту своего зала;
  - RECEPTION получает 403 на PDF клиента чужого зала (IDOR закрыт);
  - тренер A получает PDF упражнений только по своим тренировкам;
  - после деактивации связи тренер B получает 403 на PDF клиента.
- `backend/src/workouts/global-templates.e2e-spec.ts`:
  - ADMIN не видит и не может изменить/удалить личный шаблон тренера
    (404 на PUT/DELETE).
- `backend/src/chats/chats-blocking.e2e-spec.ts`:
  - подмена `admin_id` при создании чата отклоняется с 400;
  - ADMIN видит все чаты клиентов и тренеров;
  - блокировка чата учитывает тренировки конкретного тренера.
- `backend/src/notifications/notifications-fcm.e2e-spec.ts`:
  - push вызывается только для получателей с `pushToken`;
  - событие создаётся с `{ type: 'SYSTEM' }`.

## Mobile

```bash
cd mobile
flutter analyze
flutter test
```

- `flutter analyze` — **No issues found!**
- `flutter test` — **25 passed, 0 failed**, время ~8 s.
- Сборка:
  - `flutter build apk --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000`
    — `app-release.apk`, 57.8 MB;
  - `flutter build appbundle --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000`
    — `app-release.aab`, 55.3 MB.
- Проверка манифеста APK: `versionName=1.0.8`, `versionCode=10`,
  `package=com.gymapp.gym_trainer`.

## Web-admin

```bash
cd web-admin
pnpm lint
pnpm build
```

- `pnpm lint` — без ошибок; остались ранее существовавшие предупреждения
  в `src/router.tsx`.
- `pnpm build` — успешно.

## Примечания

- Jest предупреждает об открытых хендлах и требует `--forceExit`
  (существовавшее поведение).
- Для e2e добавлена общая очистка уведомлений
  `backend/test/setup-e2e.ts`, чтобы фоновые `void createEvent` не оставляли
  FK на тестовых пользователей.
