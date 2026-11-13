# Результат 021 — мягкое удаление тренеров

Дата: 2026-11-13
Статус: выполнено

## Что сделано

- В `Trainer` добавлены `isActive` и `archivedAt`, индекс по `isActive`.
- `DELETE /admin/trainers/:id` теперь архивирует тренера: история
  тренировок, замеров, чатов и рекомендаций сохраняется; активные
  связи с клиентами и залами деактивируются; refresh-токены отзываются.
- Архивный тренер не может войти и обновить токен.
- `GET /admin/trainers` по умолчанию скрывает архив; добавлен
  `include_archived=true`.
- Web-admin: колонка статуса, флажок «Показать архив», действие
  «Архивировать» вместо удаления.

## Изменённые файлы

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261113100000_trainer_archive/migration.sql`
- `backend/src/trainers/trainers.service.ts`
- `backend/src/trainers/trainers.controller.ts`
- `backend/src/trainers/dto/trainer-list-query.dto.ts` (новый)
- `backend/src/auth/auth.service.ts`
- `backend/src/trainers/trainers.e2e-spec.ts` (новый)
- `web-admin/src/pages/Trainers/index.tsx`

## Тесты и документация

- `docs/021_tests_trainer-soft-delete.md`
- `docs/readme.md` — раздел 021.
- `docs/021_plan_trainer-soft-delete.md` — шаги отмечены.

## Отклонения от плана

- Восстановление из архива не делалось: в ТЗ зафиксировано архивирование
  без отдельного требования restore.
- Телефон архивного тренера остаётся занятым; повторное создание с тем же
  телефоном запрещено, чтобы не смешивать историю.
