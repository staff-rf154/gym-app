# Тесты 017 — кэш авторизации web-admin

## Выполненные проверки

| Проверка | Команда | Результат |
|----------|---------|-----------|
| TypeScript + production build | `pnpm build` в `web-admin/` | passed, 1635 modules, 508 ms |
| Lint | `pnpm lint` в `web-admin/` | passed, 4 pre-existing warning в `router.tsx` |

## Ручные сценарии (код-ревью)

1. Вход → `setUser` пишет профиль в `localStorage` с `expiresAt` +10 ч.
2. Перезагрузка в течение 10 ч → профиль восстанавливается из кэша,
   `/auth/me` не вызывается; access получается через refresh-cookie.
3. Перезагрузка после 10 ч → запись недействительна, выполняется
   refresh + `/auth/me`, кэш перезаписывается.
4. Logout и неудачный refresh → `localStorage` очищается, пользователь
   перенаправляется на `/login`.
5. В `localStorage` нет `access_token`/`refresh_token` — только профиль.

## Ограничения

Автотестов для web-admin в проекте нет; e2e-инфраструктура отсутствует.
Проверки выполнены сборкой, линтером и код-ревью сценариев.
