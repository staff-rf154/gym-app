# 037 — Результат: изоляция данных, чаты, PDF, нижнее меню

Дата: 2026-11-16
Статус: **выполнено**

## Что сделано

### Backend: изоляция и доступ

- PDF и отчёты:
  - RECEPTION проверяется по активной связи `ClientGym` — чужой клиент
    возвращает 403 (закрыт IDOR);
  - TRAINER получает замеры только с `measuredBy = userId`, тренировки и
    упражнения — только с `trainerId` своего профиля;
  - CLIENT по-прежнему видит свои данные; подмена `client_id` отклоняется.
- `NutritionService.findTrainerNutrition` фильтрует рекомендации по
  `trainerId` — тренер не видит питание, назначенное другим тренером.
- `WorkoutsService`: ADMIN видит и изменяет только глобальные шаблоны
  (`trainerId = null`), личные шаблоны тренеров недоступны.
- `ChatsService`:
  - `admin_id` проверяется на роль ADMIN, подмена отклоняется с 400;
  - блокировка чата учитывает тренировки именно этого тренера;
  - ADMIN видит все 1:1 чаты клиентов и тренеров (для веб-панели) и может
    читать/отмечать их как прочитанные.
- `NotificationsService.persist` отправляет push только получателям с
  непустым `pushToken`.

### PDF

- `reports-pdf.service.ts` переписан: табличная вёрстка с рамками, шапкой,
  переносом длинных строк и повтором шапки на новой странице.
- Колонка «Жир, %» вместо неверного «Жир, кг».
- Неделя по умолчанию — календарная Пн–Вс в часовом поясе пользователя.
- PDF строится только при наличии шрифта DejaVu; иначе явная 500-ошибка.
- Mobile запрашивает PDF через Dio с `baseUrl`, который берётся из настроек
  сервера (`api_base_url`), и передаёт `client.id`, а не `userId`.

### Чаты

- Mobile:
  - создание чата клиент↔тренер из раздела «Чаты» и из карточки клиента
    у тренера;
  - открытие существующего чата, отправка сообщений;
  - автоматическая отметка прочитанного при открытии и получении сообщений.
- Web-admin:
  - кнопка «Новый чат»: чат с клиентом или тренером;
  - открытие чата, отметка прочитанного;
  - предупреждение и блокировка ввода при `isBlocked`;
  - ADMIN видит все чаты.
- Блокировка соответствует ТЗ 6.3 и действует в UI и API.

### Mobile UI

- Нижнее меню: высота 72, шрифт 10, подписи без переноса; сокращены
  «Тренировки» → «Трен.», «Настройки» → «Ещё», «Мои клиенты» → «Клиенты».
- `versionCode` увеличен с 9 до **10** (`versionName 1.0.8`).
- Подпись версии в настройках обновлена на «Gym App 1.0.8 (10)».

## Изменённые файлы

- `backend/src/reports/reports.service.ts`
- `backend/src/reports/reports-pdf.service.ts`
- `backend/src/reports/isolation.e2e-spec.ts` (новый)
- `backend/src/chats/chats.service.ts`
- `backend/src/chats/chats-blocking.e2e-spec.ts`
- `backend/src/nutrition/nutrition.service.ts`
- `backend/src/workouts/workouts.service.ts`
- `backend/src/workouts/global-templates.e2e-spec.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/notifications-fcm.e2e-spec.ts`
- `backend/test/setup-e2e.ts` (новый)
- `backend/jest.config.js`
- `web-admin/src/pages/Chats/index.tsx`
- `mobile/lib/app.dart`
- `mobile/lib/features/client/client_home_screen.dart`
- `mobile/lib/features/client/client_reports_tab.dart`
- `mobile/lib/features/clients/clients_screen.dart`
- `mobile/lib/features/clients/client_card_screen.dart`
- `mobile/lib/features/chats/chat_api.dart`
- `mobile/lib/features/chats/chat_models.dart`
- `mobile/lib/features/chats/chat_screen.dart`
- `mobile/lib/features/chats/chats_screen.dart`
- `mobile/lib/features/settings/settings_screen.dart`
- `mobile/pubspec.yaml`
- `README.md`
- `docs/readme.md`, `docs/037_*`

## Отклонения от плана

- ADMIN в чатах видит все 1:1 чаты, а не только свои: иначе веб-панель
  остаётся пустой при переписке клиента с тренером. Доступ к сообщениям
  ограничен ролью ADMIN.
- Добавлена общая очистка уведомлений в e2e (`test/setup-e2e.ts`) — без неё
  фоновые уведомления ломали очистку тестовых пользователей.
- Push-уведомления теперь не вызываются для пользователей без токена.

## Проверки

- Backend e2e: 32 suites / 260 tests passed — см.
  `docs/037_tests_isolation-chats-pdf.md`.
- Mobile: analyze без замечаний, 25 тестов passed, APK/AAB собраны
  (`versionCode 10`).
- Web-admin: lint и build успешны.

## Ссылки

- Задание: `docs/037_task_isolation-chats-pdf.md`
- План: `docs/037_plan_isolation-chats-pdf.md`
- Тесты: `docs/037_tests_isolation-chats-pdf.md`
- Изменения функционала: `docs/readme.md`
