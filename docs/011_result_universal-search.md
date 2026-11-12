# Result 11 — универсальный поиск по всем полям

Дата: 2026-11-12
Статус: выполнено
Задание: `docs/011_task_universal-search.md`
План: `docs/011_plan_universal-search.md`
Тесты: `docs/011_tests_universal-search.md`
Изменения функционала: `docs/readme.md`

## Что сделано

Добавлен общий хук клиентской фильтрации `useTableSearch` и поле поиска на
восьми страницах web-admin. Фильтрация интерактивная, срабатывает при вводе
3-го символа (после `trim`), регистр не учитывается, обход полей рекурсивный —
включая вложенные объекты и массивы.

## Изменённые файлы

- `web-admin/src/hooks/useTableSearch.ts` — новый общий хук.
- `web-admin/src/pages/Trainers/index.tsx` — поиск по всем полям.
- `web-admin/src/pages/Clients/index.tsx` — поиск по всем полям.
- `web-admin/src/pages/Goals/index.tsx` — поиск по всем полям.
- `web-admin/src/pages/Receptions/index.tsx` — поиск по всем полям.
- `web-admin/src/pages/Gyms/index.tsx` — поиск по всем полям.
- `web-admin/src/pages/Equipment/index.tsx` — поиск по всем полям.
- `web-admin/src/pages/Exercises/index.tsx` — локальный поиск по всем полям
  вместо серверного `q`; фильтры типа и группы мышц сохранены.
- `web-admin/src/pages/FoodProducts/index.tsx` — поиск по всем полям.
- `docs/011_task_universal-search.md`, `docs/011_plan_universal-search.md`,
  `docs/011_tests_universal-search.md`, `docs/011_result_universal-search.md`,
  `docs/readme.md`.

## Отклонения от плана

- Нет. Серверные изменения не потребовались: списки загружаются целиком.

## Проверки

- `pnpm build` — passed.
- `./node_modules/.bin/oxlint` — passed (4 предупреждения в существующем
  `src/router.tsx`, изменённых файлов не касаются).

## Ограничения

- Поиск работает по загруженным строкам. Если в будущем появится серверная
  пагинация, фильтрацию нужно будет перенести на backend.
