# Plan 3 — выполнение остатка планов (plan1 §3.4–3.5 + plan2)

Дата старта: 2026-11-11
Запрос: «согласно планам выполняем все», с фиксацией каждого выполненного шага.
Источники: `docs/plan1.md`, `docs/plan2.md`, `docs/bug2.md`, `docs/bug1.md`, `docs/new1.md`, `docs/er.md`, `docs/api.md`.

Легенда: `[ ]` не сделано, `[~]` в работе, `[x]` сделано и проверено.

---

## Этап 0 — «зелёное дерево»

- [x] BUG-2.2: `photoUrl` в `CreateClientDto`/`UpdateClientDto` (или убрать из сервиса). — добавлено в `CreateClientDto` (Update через `PartialType`).
- [x] BUG-2.1: секреты не равны примеру, `chmod 600 .env`, падение на старте при `changeme*`. — `.env` перегенерирован (Postgres/JWT/ADMIN_PASSWORD/DEFAULT_CLIENT_PASSWORD), `chmod 600`; в текущей БД админа нет — создастся при `seed` с новым паролем; `ConfigModule`-валидация требует POSTGRES_PASSWORD/JWT_SECRET/JWT_REFRESH_SECRET/ADMIN_*/DEFAULT_TIMEZONE, проверяет длину JWT и запрещает `changeme*` (`backend/src/app.module.ts`).
- [x] BUG-2.4: `ThrottlerGuard` в `APP_GUARD`, лимиты на login/refresh. — глобально 100/мин; `login` 10/мин, `refresh` 10/мин (`backend/src/auth/auth.controller.ts`).
- [ ] BUG-2.12: убрать публикацию портов PostgreSQL/Redis (или `127.0.0.1`), `requirepass` Redis.
- [~] Прогон: `npx tsc --noEmit` — без ошибок; `pnpm build` backend и web-admin — успешно; `pnpm lint` web-admin — успешно; `flutter analyze` — `No issues found!`; `flutter test` — 11/11. `pnpm test:e2e` — auth проходит; остальные e2e упираются в неприменённые миграции `20261111120000_multi_gym`/`20261111130000_security_hardening`/`20261111140000_reception` (по правилам миграции запускает человек). Повторить после миграций.

## Этап 1 — безопасность и логика

- [x] BUG-2.5: каскадная деактивация `ClientTrainer` при unlink зала / проверка `TrainerGym+ClientGym+ClientTrainer`. — каскад в `gym-links.service.ts` (`adminUnlinkTrainerGym`, `adminUnlinkClientGym`).
- [x] BUG-2.6: транзакционная очистка зависимостей при удалении клиента/тренера. — `clients.service.ts` и `trainers.service.ts` (workouts, items/results, templates, nutrition, chats/messages, notifications, refresh tokens, measurements).
- [x] BUG-2.10: `gymId` в проверке оборудования тренировки/шаблона. — `assertItems(items, gymId, trainerId)` в `workouts.service.ts`; для шаблонов — по активным залам тренера.
- [x] BUG-2.11: всегда проверять `TrainerGym({trainerId, gymId, isActive:true})`. — `assertActiveLink` в `workouts.service.ts` больше не пропускает проверку при 0 связей.
- [x] BUG-2.15: 409 вместо 500 при удалении `Gym`/`GymEquipment`/`Exercise` со ссылками. — проверки ссылок и `ConflictException`.
- [x] BUG-2.14: `distinct` получателей, `@@unique([notificationId,userId])`, уникальность `User.pushToken`. — дедуп через `Map`, индексы в `schema.prisma` + миграция `20261111130000_security_hardening`, `updatePushToken` освобождает чужой токен.
- [x] BUG-2.16: `markRead` в чате, блокировка отправки после деактивации связи. — `POST /chats/:id/read`, `assertActiveLink` в `chats.service.ts`.
- [x] BUG-2.17: `helmet`, CORS allowlist, Swagger только вне prod, magic bytes, `nosniff`. — `main.ts`, `app.module.ts`, `upload.controller.ts`.
- [x] BUG-2.13: WS allowlist origin, валидация payload, `MaxLength`, throttle, токен в `handshake.auth`. — `chat.gateway.ts`, `message.dto.ts`.
- [x] BUG-2.18: `forbidNonWhitelisted`, `@MaxLength`, `@Min(0)`, bcrypt 12+, HMAC refresh, reuse-detection, фиктивный хеш, `algorithms: ['HS256']`. — DTO, `auth.service.ts`, стратегии, `chat.gateway.ts`.

## Этап 2 — frontend-паритет

- [x] BUG-2.7: role-guard в web-admin, раздельное меню, 403-страница, проверка роли на логине. — `RoleRoute`/`HomeRedirect` в `web-admin/src/router.tsx`, `MainLayout.tsx`, `Forbidden.tsx`, `Login.tsx`.
- [x] BUG-2.8: refresh в httpOnly-cookie, access в памяти. — cookie в `auth.controller.ts`, in-memory zustand `web-admin/src/store/auth.ts`, refresh через cookie.
- [x] BUG-2.9: admin-эндпоинт замеров. — `AdminWeightMeasurementsController` (`GET/POST /admin/clients/:id/weight-measurements`), `ClientWeight` использует их.
- [x] BUG-2.20: error/empty/loading, отправка `null`, переход к оборудованию, убрать заглушки. — Alert/Empty/refetch во всех CRUD-страницах, `null` для опциональных полей, вложения чата, рабочие вкладки тренировок mobile.
- [x] web-admin: `GymsDrawer` (залы тренера/клиента), `assignedBy`, загрузка фото. — `components/GymsDrawer.tsx`, `components/PhotoUpload.tsx`, страницы Clients/Trainers, колонка «Назначил».
- [x] BUG-2.19: mobile — «Мои залы», выбор тренера, фильтр `gym_id`, `assignedBy`, push тренеру. — `features/gyms/my_gyms_screen.dart`, настройки, `fetchGyms()` → `/trainer/gyms`, gym-фильтр в карточке клиента, `initClientPush` у тренера, `assignedByLabel`.

## Этап 3 — уникальность и качество

- [~] BUG-2.21: общий `useCrudModal`/хуки, единые утилиты mobile, единый список таймзон. — добавлены `web-admin/src/hooks/useCrudModal.ts` (используется в Receptions), `web-admin/src/constants/options.ts`, `web-admin/src/utils/format.ts`, `mobile/lib/core/utils/format.dart`; список таймзон web и mobile синхронизирован (33 зоны). Хук пока внедрён не во все CRUD-страницы (локальное состояние осталось в 6 страницах).
- [x] Удалить мёртвый код (`ClientWorkoutEquipment`, неиспользуемый режим редактирования). — класс удалён, дублирующий форматтер убран, неиспользуемые ветки UI вычищены.
- [~] e2e: отзыв доступа, gym-scoping, удаление, уведомления; UI-smoke. — создан `backend/src/reception/reception.e2e-spec.ts` (изоляция залов, отзыв доступа, удаление ресепшена); существующие e2e покрывают доступ/удаление/уведомления; запуск reception-e2e блокирован неприменённой миграцией. Flutter UI-smoke 11/11.

## Этап 4 — продукт (reception)

- [x] `Role.RECEPTION`, модель `Reception`, миграция, seed ресепшена. — `schema.prisma`, миграция `20261111140000_reception`, опциональный seed по `RECEPTION_PHONE`/`RECEPTION_PASSWORD`/`RECEPTION_GYM_ID`.
- [x] `backend/src/receptions/`, `backend/src/reception/`, `/reception/*`, фото. — admin CRUD + `reception` контроллер (свой зал, клиенты/тренеры, фото, привязка тренера с `assignedBy=RECEPTION`).
- [x] web-admin: `Receptions`, `ReceptionLayout`, `reception/Clients`, `reception/Trainers`, меню по роли. — страницы `pages/Receptions`, `pages/reception/Clients`, `pages/reception/Trainers`; маршруты и меню по роли (reception-разделы в общем `MainLayout`).
- [~] e2e receptions/isolation, UI-smoke, тег `sprint-5`. — e2e-спек написан; запуск после миграции; UI-smoke mobile пройден; web-UI-smoke автоматизацией не покрыт.

## plan2 — отложенное

- [x] Агрегирующий backend-эндпоинт статистики дашборда. — `GET /admin/dashboard/stats` (`backend/src/dashboard/`), Dashboard переведён на один запрос.
- [x] BUG-2.20 (входит в Этап 2).

---

## Журнал выполнения

- 2026-11-11: этапы 1 и 2 закрыты, добавлены reception-backend, веб-страницы ресепшена, агрегирующий дашборд, мобильные «Мои залы», общие утилиты; обновлены `docs/er.md` и `docs/api.md`.
- 2026-11-11: проверки — backend `tsc`/`build` без ошибок, web-admin `build`/`lint` успешно, `flutter analyze`/`flutter test` успешно, auth-e2e успешно.
- 2026-11-11: осталось у человека — применить миграции `20261111120000_multi_gym`, `20261111130000_security_hardening`, `20261111140000_reception`, выполнить seed при необходимости и повторить `pnpm test:e2e`. BUG-2.12 отложен осознанно.
