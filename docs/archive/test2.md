# Test 2 — проверки выполнения plan3

Дата: 2026-11-11

## Backend

- `npx prisma generate` — успешно (клиент с `Reception`/`Role.RECEPTION`).
- `npx tsc --noEmit -p tsconfig.json` — без ошибок.
- `pnpm build` — успешно.
- `pnpm test:e2e` — 17/17 наборов, 129/129 тестов успешно.
- `pnpm test:e2e --testPathPattern=auth.e2e-spec` — 11/11 успешно.
- `pnpm test:e2e --testPathPattern=client-trainers.e2e-spec` — 14/14 успешно.
- Новый спек `backend/src/reception/reception.e2e-spec.ts` — 7/7 успешно:
  - admin создаёт/читает/удаляет ресепшен;
  - ресепшен видит только свой зал;
  - создание клиента/тренера сразу с привязкой к залу;
  - привязка тренера с `assignedBy=RECEPTION`;
  - чужой ресепшен получает 403 на чтение/изменение клиента;
  - отвязка тренера деактивирует связь (отзыв доступа);
  - удаление ресепшена удаляет пользователя.

## Исправления по ходу проверки

- `backend/prisma/migrations/20261111120000_multi_gym/migration.sql` — backfill `TrainerGym`/`ClientGym` использовал `ON CONFLICT` до создания unique-индексов, из-за чего `prisma migrate deploy` падал. `ON CONFLICT` убран (`GROUP BY` уже дедуплицирует).
- `backend/src/clients/client-trainers.e2e-spec.ts` — в `beforeAll`/`afterAll` добавлена очистка `TrainerGym`/`ClientGym` до удаления тренеров и клиентов (устранено нарушение FK при cleanup).
- `backend/src/workouts/workouts.e2e-spec.ts` — фикстуры дополнены `TrainerGym`/`ClientGym` (иначе новый `assertActiveLink` возвращал 403).
- `backend/src/chats/chat-ws.e2e-spec.ts` — фикстуры дополнены залом и активной связью `ClientTrainer` (иначе `chat:send` возвращал `ok=false`).
- Миграции `20261111120000_multi_gym`, `20261111130000_security_hardening`, `20261111140000_reception` применены к БД.

## Web-admin

- `pnpm build` — успешно (предупреждение Vite о размере чанка 1.54 MB).
- `pnpm lint` / `oxlint` — успешно, только ранее существовавшие предупреждения `router.tsx` (3× `only-export-components`, 1× `set-state-in-effect`).

## Mobile

- `flutter analyze` — `No issues found!`.
- `flutter test` — 11/11 (widget + UI-smoke M8–M14).

## PostgreSQL

- Порт опубликован как `0.0.0.0:5432->5432/tcp` (`docker-compose.yml`: `"5432:5432"`).
- `postgresql.conf`: `listen_addresses = '*'`; `pg_hba.conf`: `0.0.0.0/0` и `::/0` с `scram-sha-256`.
- Доступ с хоста проверен применением миграций через `127.0.0.1:5432`; контейнер healthy.

## Ручные проверки после миграций (чек-лист)

- [ ] Войти администратором, создать зал, ресепшен, клиента и тренера.
- [ ] Войти ресепшеном: видны только свой зал, его клиенты и тренеры.
- [ ] Создать клиента/тренера, загрузить фото, привязать тренера — `assignedBy=RECEPTION`.
- [ ] Отвязать тренера — доступ к клиенту пропадает.
- [ ] Проверить дашборд: один запрос `/admin/dashboard/stats`.
- [ ] Mobile: «Мои залы», выбор тренера клиентом, фильтр тренировок по залу, push тренеру.
