# Тесты 024 — сохранение авторизации web-admin при перезагрузке

## Команды

```bash
docker compose up -d --build backend
docker compose exec -T backend pnpm test:e2e -- auth
```

Проверка cookie по HTTP и HTTPS-заголовку:

```bash
curl -s -D - -o /dev/null \
  -H 'Content-Type: application/json' \
  -d '{"phone":"...","password":"..."}' \
  http://127.0.0.1:8080/api/v1/auth/login
```

## Результат

- `pnpm build` (backend) — passed.
- `pnpm test:e2e -- auth` — 1 suite, 12 tests passed, 0 failed, 11.2 s.
- Добавлены проверки:
  - login по HTTP ставит refresh-cookie с `HttpOnly`, `SameSite=Strict`
    и **без** `Secure`;
  - login с `X-Forwarded-Proto: https` ставит cookie с `Secure`;
  - `/auth/refresh` по cookie без body возвращает 200.
- Ручная проверка:
  - HTTP `Set-Cookie` — без `Secure`;
  - HTTPS-прокси `Set-Cookie` — с `Secure`;
  - refresh с cookie-банкой по HTTP — `200`.

## Примечание

Первый прогон с тремя дополнительными логинами упирался в throttle
(10 логинов/мин): 2 теста push-token получали 401. Тесты перестроены
на один дополнительный логин, итог — 12/12 passed.