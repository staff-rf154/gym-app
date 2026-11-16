# 038 — Результат: скорость, PDF-таблицы, бейджи, чат с ресепшеном

Дата: 2026-11-16
Статус: **выполнено** (код, проверки, сборка и деплой)

## Что сделано

### Backend: облегчённый календарь

- Добавлены `GET /client/workouts/calendar` и
  `GET /trainer/workouts/calendar`.
- Ответ содержит только `id`, `clientId`, `trainerId`, `gymId`, `date`,
  `startTime`, `status` — без упражнений, оборудования и результатов.
- `from`/`to` обязательны (`YYYY-MM-DD`), проверяется `from <= to`;
  у тренера доступны фильтры `client_id`/`gym_id`.
- Маршрут `calendar` объявлен до `:id`, поэтому не перехватывается
  получением тренировки по идентификатору.

### Mobile: скорость

- Календарь клиента и тренера загружает месяц облегчённым ответом.
- При открытии дня клиент догружает полные тренировки этого дня; во время
  загрузки показывается индикатор.
- После сохранения/старта/завершения тренировки инвалидируется только
  текущий месяц, а не все месяцы.
- Раздел «Тренировки» запрашивает только выбранный период (`WorkoutPeriod`),
  а не все годы с 2020-го; при смене периода выполняется новый запрос.

### Mobile: бейджи

- Добавлен провайдер суммы непрочитанных чатов.
- Цифра непрочитанных показывается на вкладке «Чаты» клиента и на иконке
  чатов тренера.
- Бейдж обновляется после отметки прочитанного и после возврата из чата.
- Бейдж уведомлений в AppBar сохранён.

### Чат клиента с ресепшеном

- `ChatsService` принимает RECEPTION в чаты `CLIENT_ADMIN`/`TRAINER_ADMIN`.
- Клиент без `admin_id` получает ресепшен своего зала (активная связь
  `ClientGym`); если зала/ресепшена нет — ADMIN (fallback).
- Явный `admin_id` проверяется: ADMIN допускается всегда, RECEPTION — только
  для клиента/тренера своего зала.
- Web-admin: пункт «Чаты» и маршрут доступны RECEPTION; создание нового чата
  оставлено только ADMIN, ресепшен отвечает в существующих чатах.
- Mobile: в разделе «Чаты» добавлена кнопка «Написать ресепшену».

### PDF-таблицы

- Табличная вёрстка PDF веса и упражнений реализована в задаче 037.
- Причина, по которой пользователь её не видел: работающий контейнер backend
  был собран 2026-11-14, а изменения 037 закоммичены 2026-11-16. Backend и
  web-admin пересобраны и перезапущены 2026-11-16 10:23 +07.

### Сборка и деплой

- Mobile: версия **1.0.9 (11)**, `apkanalyzer` подтвердил version-name/code.
- Собраны `app-release.apk` (57.9 MiB) и `app-release.aab` (55.3 MiB).
- `docker compose up -d --build`: образы backend/web-admin пересобраны,
  контейнеры пересозданы и healthy; backend health `{"status":"ok"}`,
  web-admin HTTP 200, миграции применены (`Database schema is up to date!`).

## Изменённые файлы

- `backend/src/workouts/workouts.service.ts`
- `backend/src/workouts/workouts.controller.ts`
- `backend/src/workouts/dto/workout-calendar-query.dto.ts` (новый)
- `backend/src/workouts/workouts-calendar.e2e-spec.ts` (новый)
- `backend/src/chats/chats.service.ts`
- `backend/src/chats/chats.controller.ts`
- `backend/src/chats/chats-reception.e2e-spec.ts` (новый)
- `mobile/lib/features/client/client_workouts_api.dart`
- `mobile/lib/features/client/client_workouts_providers.dart`
- `mobile/lib/features/client/client_workout_models.dart`
- `mobile/lib/features/client/client_workouts_tab.dart`
- `mobile/lib/features/client/client_calendar_tab.dart`
- `mobile/lib/features/client/workout_day_screen.dart`
- `mobile/lib/features/client/client_home_screen.dart`
- `mobile/lib/features/workouts/workouts_api.dart`
- `mobile/lib/features/clients/trainer_calendar_tab.dart`
- `mobile/lib/features/clients/clients_screen.dart`
- `mobile/lib/features/chats/chat_providers.dart`
- `mobile/lib/features/chats/chat_screen.dart`
- `mobile/lib/features/chats/chats_screen.dart`
- `mobile/lib/features/settings/settings_screen.dart`
- `mobile/pubspec.yaml`
- `mobile/test/ui_smoke_test.dart`
- `web-admin/src/layouts/MainLayout.tsx`
- `web-admin/src/router.tsx`
- `web-admin/src/pages/Chats/index.tsx`
- `docs/038_task_mobile-performance-chats-reception.md`
- `docs/038_plan_mobile-performance-chats-reception.md`
- `docs/038_tests_mobile-performance-chats-reception.md`
- `docs/038_result_mobile-performance-chats-reception.md`
- `docs/readme.md`

## Отклонения от плана

- Схема БД не менялась: чат с ресепшеном использует существующие
  `Chat.adminId` и `ChatType.CLIENT_ADMIN`.
- В web-admin ресепшену доступен только просмотр и ответы в чатах; создание
  чата скрыто, потому что списки клиентов/тренеров для формы используют
  админские эндпоинты.
- Добавлена `afterAll`-очистка в новые e2e, чтобы не ломать чужие наборы
  (совпадение имён залов и общая очистка уведомлений).
- APK/AAB и Docker-образы собраны и задеплоены 2026-11-16.

## Проверки

- Backend e2e: **34 suites / 271 tests passed** — см.
  `docs/038_tests_mobile-performance-chats-reception.md`.
- Mobile: `flutter analyze` без замечаний, `flutter test` — 25 passed.
- Web-admin: `pnpm build` успешно, `oxlint` без ошибок.
- Деплой: backend/web-admin healthy, health `{"status":"ok"}`, web-admin HTTP 200,
  миграции применены. Mobile 1.0.9 (11) собран (APK/AAB).

## Ссылки

- Задание: `docs/038_task_mobile-performance-chats-reception.md`
- План: `docs/038_plan_mobile-performance-chats-reception.md`
- Тесты: `docs/038_tests_mobile-performance-chats-reception.md`
- Изменения функционала: `docs/readme.md`
