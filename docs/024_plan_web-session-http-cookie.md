# План 024 — сохранение авторизации web-admin при перезагрузке

## Цель

Устранить разлогин после `Ctrl+R` на HTTP-стенде, не ослабляя безопасность
HTTPS-развёртывания.

## Шаги

1. [x] В `backend/src/auth/auth.controller.ts` вычислять `Secure` у refresh-cookie
   по фактическому протоколу запроса (`X-Forwarded-Proto`, затем `request.secure`).
2. [x] Передавать запрос в установку/очистку cookie в `login`, `refresh`,
   `logout`, `change-password`.
3. [x] Собрать backend и прогнать `auth` e2e-тесты.
4. [x] Пересобрать контейнер backend и проверить `Set-Cookie` по HTTP/HTTPS.
5. [x] Зафиксировать тесты, результат и обновить `docs/readme.md`.

## Критерии готовности

- По HTTP `Set-Cookie` не содержит `Secure`, по `X-Forwarded-Proto: https` — содержит.
- Логин и последующий `/auth/refresh` по HTTP работают с cookie.
- `pnpm build` и auth e2e проходят.
- В `docs/` созданы task/plan/tests/result, обновлён `docs/readme.md`.