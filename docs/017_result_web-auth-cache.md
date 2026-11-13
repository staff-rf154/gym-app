# Результат 017 — кэш авторизации web-admin на 10 часов

## Статус

Выполнено.

## Что сделано

- В `web-admin/src/store/auth.ts` добавлен кэш профиля в `localStorage`
  (`gym-admin-auth`) с TTL 10 часов.
- В кэше хранится только `user_id`, `role`, `name`, `phone`, `timezone`
  и `expiresAt`; токены не сохраняются.
- При истечении TTL кэш удаляется, сессия сбрасывается таймером.
- При восстановлении сессии `web-admin/src/router.tsx` пропускает
  `/auth/me`, если профиль взят из валидного кэша; access-токен
  по-прежнему получается через httpOnly refresh-cookie.
- Logout и неудачный refresh очищают кэш.
- Access-токен остаётся только в памяти (zustand), как и раньше.

## Изменённые файлы

- `web-admin/src/store/auth.ts`
- `web-admin/src/router.tsx`
- `docs/017_task_web-auth-cache.md`
- `docs/017_plan_web-auth-cache.md`
- `docs/017_tests_web-auth-cache.md`
- `docs/017_result_web-auth-cache.md`
- `docs/readme.md`

## Проверки

`pnpm build` — passed; `pnpm lint` — passed (4 pre-existing warning).
Подробнее: `docs/017_tests_web-auth-cache.md`.

## Отклонения от плана

Автотестов для web-admin нет, поэтому проверка ограничена сборкой,
линтером и код-ревью сценариев.

## Дальше по очереди 017

Следующие шаги — из `docs/016_result_tz-disagreements.md`: пагинация,
замеры веса для ADMIN/RECEPTION, отчёты в SQL, мягкое удаление тренеров,
Redis, уведомления для всех ролей, UI паролей, сброс кешей mobile,
`gym_test`, `pg_hba`, code-splitting.
