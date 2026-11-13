# Bug 1 — тренер без профиля Trainer не мог войти

## Симптом

После задания 021 (`isArchivedTrainer`) вход пользователя с ролью
`TRAINER`, у которого ещё нет записи `Trainer`, возвращал
`401 Trainer is archived`. E2E падали в наборах gyms, exercises,
food-products, equipment: 4 suite, 5 тестов, ожидался 403/200,
получался 401.

## Причина

В `backend/src/auth/auth.service.ts`:

```ts
return !trainer?.isActive;
```

При `trainer === null` выражение давало `true`, то есть отсутствующий
профиль трактовался как архивный.

## Исправление

```ts
return trainer?.isActive === false;
```

Архивным считается только существующий профиль с `isActive=false`.

## Тесты

- `pnpm build` — успешно.
- `pnpm test:e2e` — 26 suites, 201 tests passed.
- Воспроизведение до фикса: `src/gyms/gyms.e2e-spec.ts` — 1 failed.
- После фикса: полный прогон зелёный, включая `trainers.e2e-spec.ts`
  (архивный тренер по-прежнему не входит).
