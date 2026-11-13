# Результат 024 — сохранение авторизации web-admin при перезагрузке

## Статус

Выполнено.

## Причина

`backend/src/auth/auth.controller.ts` ставил refresh-cookie с
`secure: process.env.NODE_ENV === 'production'`. В контейнере
`NODE_ENV=production`, а web-admin открыт по HTTP, поэтому браузер
отбрасывал `Secure`-cookie. После `Ctrl+R` access-токена в памяти нет,
`/auth/refresh` не получал cookie и возвращал 401 → редирект на логин.

## Что сделано

- `Secure` вычисляется по фактическому протоколу запроса:
  `X-Forwarded-Proto` (nginx передаёт `$scheme`), затем `request.secure`.
- На HTTP cookie ставится без `Secure`, на HTTPS — с `Secure`.
- Запрос передаётся в установку/очистку cookie в `login`, `refresh`,
  `logout`, `change-password`.
- Клиентский кэш профиля на 10 часов и TTL refresh-токена 30 дней
  не менялись.
- В `backend/src/auth/auth.e2e-spec.ts` добавлены регрессионные проверки
  cookie и refresh по cookie.

## Изменённые файлы

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.e2e-spec.ts`
- `docs/024_task_web-session-http-cookie.md`
- `docs/024_plan_web-session-http-cookie.md`
- `docs/024_tests_web-session-http-cookie.md`
- `docs/024_result_web-session-http-cookie.md`
- `docs/bug2.md`
- `docs/readme.md`

## Проверки

- `pnpm build` — passed.
- `docker compose exec -T backend pnpm test:e2e -- auth` — 12/12 passed.
- Контейнер backend пересобран и перезапущен.
- Подробнее: `docs/024_tests_web-session-http-cookie.md`.

## Отклонения от плана

Нет. Жёсткое серверное ограничение сессии ровно 10 часами не добавлялось:
пользователь выбрал вариант «Secure по фактическому протоколу».