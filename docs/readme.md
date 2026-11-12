# Readme — журнал изменений функционала

## 2026-11-12 — Задание 14: залы не отображаются при создании тренировки

Файлы задания: `docs/014_task_gym-links-routes.md`,
`docs/014_plan_gym-links-routes.md`, `docs/014_tests_gym-links-routes.md`,
`docs/014_result_gym-links-routes.md`.

Что изменилось:

- Было: модуль `GymLinksModule` не был подключён в `backend/src/app.module.ts`,
  поэтому маршруты `GET /trainer/gyms`, `GET /client/gyms`,
  `GET /client/trainers`, `GET /client/gyms/:gymId/trainers`,
  привязка/отвязка тренера и административные маршруты привязки залов
  отвечали 404. Мобильный экран создания тренировки не получал залы.
- Стало: `GymLinksModule` зарегистрирован, перечисленные маршруты доступны;
  тренер получает свои залы и создаёт тренировку клиента, клиент видит свои
  залы и тренеров. Web-admin снова может привязывать залы к тренерам и
  клиентам.
- Схема данных, DTO и мобильный код не менялись.
- Добавлен e2e-тест `backend/src/gym-links/gym-links.e2e-spec.ts`.

Файлы: `backend/src/app.module.ts`,
`backend/src/gym-links/gym-links.e2e-spec.ts`.

## 2026-11-12 — Задание 13: тренер не может создать тренировку

Файлы задания: `docs/013_task_trainer-workout-create.md`,
`docs/013_plan_trainer-workout-create.md`,
`docs/013_tests_trainer-workout-create.md`,
`docs/013_result_trainer-workout-create.md`.

Что изменилось:

- Было: `TrainerClient.fromJson` ожидал `goal` строкой, а backend после
  перехода на справочник целей отдаёт `goal` объектом
  `{ id, name, description }` и `goalText`. Список `/trainer/clients` падал
  с `TypeError`, поэтому тренер не мог открыть клиента и создать тренировку.
- Стало: мобильное приложение понимает новый объект цели, старую строку и
  `goalText`; список клиентов и создание тренировки работают.
- Backend, web-admin, схема данных и Android-конфигурация не менялись.
- Версия mobile поднята до `1.0.2+3`; пересобраны APK/AAB с debug-подписью.

Файлы: `mobile/lib/features/clients/trainer_client.dart`,
`mobile/test/widget_test.dart`, `mobile/pubspec.yaml`,
`mobile/build/app/outputs/flutter-apk/app-release.apk`,
`mobile/build/app/outputs/bundle/release/app-release.aab`.

## 2026-11-12 — Задание 12: релизная сборка мобильного приложения

Файлы задания: `docs/012_task_release-mobile.md`,
`docs/012_plan_release-mobile.md`, `docs/012_tests_release-mobile.md`,
`docs/012_result_release-mobile.md`.

Что изменилось:

- Было: `mobile/pubspec.yaml` содержал версию `1.0.0+1`, релизные артефакты
  не собирались.
- Стало: версия `1.0.1+2` (versionName `1.0.1`, versionCode `2`); собраны
  `app-release.apk` и `app-release.aab` с debug-подписью.
- Backend, web-admin, Android-конфигурация и схема данных не менялись.
- Файлы: `mobile/pubspec.yaml`,
  `mobile/build/app/outputs/flutter-apk/app-release.apk`,
  `mobile/build/app/outputs/bundle/release/app-release.aab`.

## 2026-11-12 — Задание 11: универсальный поиск по всем полям (web-admin)

Файлы задания: `docs/011_task_universal-search.md`,
`docs/011_plan_universal-search.md`, `docs/011_tests_universal-search.md`,
`docs/011_result_universal-search.md`.

Что изменилось:

- На страницах «Тренеры», «Клиенты», «Цели», «Ресепшн», «Залы», «Тренажёры»,
  «Упражнения», «Продукты» появилось поле поиска.
- Было: списки отображались целиком; у упражнений поиск шёл только по названию
  через серверный параметр `q` и срабатывал по Enter/иконке.
- Стало: поиск интерактивный, фильтрует строки при вводе 3-го символа;
  проверяются все поля записи, включая вложенные объекты и массивы
  (цель, залы, тренеры и т.п.); регистр не важен.
- Упражнения: серверный `q` больше не используется, фильтры «Тип» и
  «Группа мышц» сохранены.
- Backend и схема данных не менялись.

Файлы: `web-admin/src/hooks/useTableSearch.ts`,
`web-admin/src/pages/{Trainers,Clients,Goals,Receptions,Gyms,Equipment,Exercises,FoodProducts}/index.tsx`.
