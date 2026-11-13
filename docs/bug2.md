# Bug 2 — web-admin разлогинивался после Ctrl+R на HTTP

## Симптом

При перезагрузке страницы web-admin (`Ctrl+R`) пользователь попадал на
страницу входа, хотя refresh-сессия должна была действовать 10 часов.

## Причина

В `backend/src/auth/auth.controller.ts` refresh-cookie выставлялась с
`secure: process.env.NODE_ENV === 'production'`. В Docker
`NODE_ENV=production`, а стенд открыт по HTTP. Браузер не сохраняет
`Secure`-cookie, полученную по HTTP, поэтому `/auth/refresh` после
перезагрузки не находил токен и возвращал 401.

## Исправление

`Secure` теперь зависит от протокола запроса:

- `X-Forwarded-Proto: https` (nginx) или `request.secure` → `Secure`;
- HTTP → без `Secure`.

Запрос прокинут в `setRefreshCookie`/`clearRefreshCookie` во всех
эндпоинтах, работающих с cookie.

## Тесты

- `pnpm build` — успешно.
- `docker compose exec -T backend pnpm test:e2e -- auth` — 12/12 passed.
- Проверено: HTTP `Set-Cookie` без `Secure`, HTTPS-прокси — с `Secure`;
  refresh по cookie без body — 200.