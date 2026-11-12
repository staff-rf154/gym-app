Полная инструкция: подготовка Ubuntu-сервера с Docker и запуск OpenCode для Спринта 1
Общая картина
Вы будете работать на Ubuntu-сервере (VPS или локальная машина). Docker обеспечивает изоляцию PostgreSQL, Redis и backend. OpenCode запускается внутри той же папки проекта и генерирует код. Ваша задача — выполнить подготовку командой, затем отправлять OpenCode короткие промпты по одному модулю за раз.
________________________________________
Часть 1. Подготовка Ubuntu-сервера (один раз, ~20 минут)
1.1. Проверить версию Ubuntu и обновить систему
bash
lsb_release -a          # должна быть 22.04 или 24.04
sudo apt update && sudo apt upgrade -y
1.2. Установить Docker
bash
# Вспомогательные пакеты
sudo apt install -y curl software-properties-common ca-certificates apt-transport-https

# GPG-ключ Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Репозиторий
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
Проверка:
bash
sudo docker run hello-world
Если видите Hello from Docker! — всё работает .
1.3. Разрешить запуск Docker без sudo (важно для OpenCode)
bash
sudo usermod -aG docker $USER
newgrp docker          # или выйдите и зайдите заново
docker ps              # должно работать без sudo
1.4. Установить Node.js 22 LTS
bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
node -v                # ожидается v22.x
1.5. Установить pnpm
bash
npm install -g pnpm
pnpm -v                # ожидается 8.x или 9.x
1.6. Установить OpenCode
bash
curl -fsSL https://opencode.ai/install | bash
export PATH="$HOME/.opencode/bin:$PATH"
opencode --version
Если opencode не находится после перезапуска терминала, добавьте PATH в ~/.bashrc:
bash
echo 'export PATH="$HOME/.opencode/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
1.7. Настроить API-ключ для LLM
OpenCode требует ключ провайдера. Если вы новичок, рекомендую OpenCode Zen (есть бесплатные модели):
bash
opencode
# В TUI выполните: /connect
# Выберите opencode → перейдите на opencode.ai/auth → получите ключ → вставьте
Или установите ключ через переменную окружения:
bash
export OPENCODE_API_KEY="ваш_ключ"
________________________________________
Часть 2. Подготовка проекта (один раз, ~10 минут)
2.1. Создать папку проекта
bash
mkdir -p ~/projects/gym-app
cd ~/projects/gym-app
git init
mkdir -p backend web-admin docs secrets
2.2. Создать файлы, которые OpenCode будет читать
.gitignore
text
node_modules/
dist/
build/
.env
secrets/
uploads/
*.log
.DS_Store
.env.example
text
POSTGRES_PASSWORD=changeme_postgres
JWT_SECRET=changeme_access_secret_min_32_chars
JWT_REFRESH_SECRET=changeme_refresh_secret_min_32_chars
DEFAULT_CLIENT_PASSWORD=ChangeMe123!
ADMIN_PHONE=+70000000000
ADMIN_PASSWORD=AdminPass123!
DEFAULT_TIMEZONE=Asia/Novosibirsk
docs/er.md — вставьте полное содержимое ER-модели из моего предыдущего сообщения (блок «Создать docs/er.md»).
docs/api.md — вставьте полный openapi.yaml из моего предыдущего сообщения (блок «OpenAPI 3.1 — спецификация MVP»).
2.3. Скопировать .env и сменить пароли
bash
cp .env.example .env
nano .env    # смените POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
Запомните ADMIN_PHONE и ADMIN_PASSWORD — это вход в админку.
2.4. Первый коммит
bash
git add .
git commit -m "chore: scaffolding"
________________________________________
Часть 3. Настройка OpenCode для экономии токенов (важно!)
3.1. Создать AGENTS.md в корне проекта
Этот файл сообщает OpenCode правила проекта. Он читается автоматически при каждом запросе, поэтому не нужно повторять контекст в каждом промпте.
Актуальное содержимое правил — в корневом `AGENTS.md`; здесь не дублируется.
3.2. Принципы работы, экономящие токены
Делать	Не делать
Один промпт = один модуль (gyms, equipment, auth)	«Сделай весь CRUD»
Ссылаться на @docs/er.md и @docs/api.md	Копировать схему в чат
Отдельный промпт на тесты	«Фича + тесты» вместе
git commit после каждого зелёного модуля	Один коммит в конце
Новый чат для нового модуля	Всё в одном чате
make test после каждого модуля	Запускать всё в конце
________________________________________
Часть 4. Промпты для OpenCode — Спринт 1 (по одному модулю)
Как работать
1.	cd ~/projects/gym-app
2.	opencode
3.	Отправить промпт → дождаться → проверить в другом терминале → git commit
4.	Для следующего модуля — новый чат (/new или перезапуск)
________________________________________
Промпт 1.1 — Backend инициализация (новый чат)
text
Создай backend/ как NestJS-проект с pnpm.

Зависимости: @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/swagger @nestjs/throttler @nestjs/serve-static passport passport-jwt @prisma/client prisma bcrypt class-validator class-transformer reflect-metadata rxjs
Dev: typescript @types/node @types/bcrypt @types/passport-jwt jest ts-jest @types/jest supertest @types/supertest @nestjs/testing @nestjs/cli ts-node

Структура src/:
- main.ts: prefix /api/v1, ValidationPipe whitelist, Swagger /api/docs, порт PORT=8080
- app.module.ts: ConfigModule.forRoot isGlobal, ThrottlerModule, ServeStaticModule /uploads
- common/guards/jwt-auth.guard.ts (глобальный через APP_GUARD)
- common/guards/roles.guard.ts
- common/decorators/roles.decorator.ts, public.decorator.ts, current-user.decorator.ts
- health/health.controller.ts (GET /health → {status:'ok'}, @Public)

tsconfig strict true. jest.config.js testRegex .*\.e2e-spec\.ts$
Dockerfile multi-stage node:20-alpine + pnpm.
package.json scripts: "seed": "ts-node prisma/seed.ts"
Проверка:
bash
cd backend && pnpm install
________________________________________
Промпт 1.2 — Prisma schema (новый чат)
text
Прочитай @docs/er.md.
Создай backend/prisma/schema.prisma строго по этому файлу.
Все DateTime → @db.Timestamptz. Workout.date → @db.Date. Все enum и relations как в ER.
datasource postgresql url env("DATABASE_URL").
Создай backend/src/prisma/prisma.service.ts и prisma.module.ts (@Global). Зарегистрируй в app.module.ts.
Не запускай миграцию.
Проверка:
bash
cd backend
DATABASE_URL="postgresql://gym:changeme_postgres@localhost:5432/gym" pnpm prisma migrate dev --name init
________________________________________
Промпт 1.3 — Seed админа (тот же чат)
text
Создай backend/prisma/seed.ts:
читает ADMIN_PHONE, ADMIN_PASSWORD, DEFAULT_TIMEZONE из env.
upsert User(phone=ADMIN_PHONE) с role ADMIN, name 'Администратор', bcrypt hash, timezone.
Идемпотентно.
Проверка:
bash
cd backend
DATABASE_URL="postgresql://gym:changeme_postgres@localhost:5432/gym" ADMIN_PHONE="+70000000000" ADMIN_PASSWORD="AdminPass123!" DEFAULT_TIMEZONE="Asia/Novosibirsk" pnpm seed
________________________________________
Промпт 1.4 — Docker compose (новый чат)
text
Создай корневой docker-compose.yml:
- postgres:16-alpine, env POSTGRES_DB=gym, POSTGRES_USER=gym, POSTGRES_PASSWORD=${POSTGRES_PASSWORD}, volume pgdata, ports 5432:5432, healthcheck pg_isready
- redis:7-alpine, ports 6379:6379
- backend build ./backend, depends_on postgres service_healthy и redis, ports 8080:8080, environment DATABASE_URL=postgresql://gym:${POSTGRES_PASSWORD}@postgres:5432/gym, JWT_SECRET, JWT_REFRESH_SECRET, DEFAULT_CLIENT_PASSWORD, ADMIN_PHONE, ADMIN_PASSWORD, DEFAULT_TIMEZONE, volumes ./uploads:/app/uploads
- web-admin build ./web-admin, depends_on backend, ports 3000:80
volumes: pgdata

Создай Makefile:
up: docker compose up -d --build
down: docker compose down
migrate: docker compose exec backend npx prisma migrate deploy
seed: docker compose exec backend npx prisma db seed
logs: docker compose logs -f backend
test: docker compose exec backend pnpm test
psql: docker compose exec postgres psql -U gym gym
Проверка:
bash
# Остановить временный postgres если был:
docker stop gym-pg 2>/dev/null; docker rm gym-pg 2>/dev/null
make up
make migrate
make seed
curl http://localhost:8080/api/v1/health
Ожидается: {"status":"ok"}.
________________________________________
Промпт 1.5 — Auth (новый чат)
text
Прочитай @docs/api.md разделы /auth/*.
Создай backend/src/auth/:
- auth.module.ts, auth.service.ts, auth.controller.ts
- dto/login.dto.ts, dto/refresh.dto.ts, dto/update-timezone.dto.ts
- strategies/jwt.strategy.ts (secret JWT_SECRET), strategies/jwt-refresh.strategy.ts (secret JWT_REFRESH_SECRET)

Эндпоинты:
POST /auth/login (@Public) — bcrypt проверка, access 15m, refresh 30d. Сохранить hash refresh в RefreshToken. Вернуть {access_token, refresh_token, role, user_id}. Неверный пароль → 401.
POST /auth/refresh (@Public) — проверить hash в БД, rotation (удалить старый, выдать новый). Иначе 401.
GET /auth/me — {user_id, role, name, phone, timezone}
PATCH /auth/timezone — валидировать Intl.supportedValuesOf('timeZone'), невалидный → 400, обновить → 204.

JwtAuthGuard глобальный, кроме @Public(). RolesGuard + @Roles(ADMIN) точечно.
Проверка:
bash
make down && make up
curl -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"phone":"+70000000000","password":"AdminPass123!"}'
________________________________________
Промпт 1.6 — Тесты Auth (тот же чат)
text
Создай backend/src/auth/auth.e2e-spec.ts (Jest + supertest):
- login верный → 200, есть access_token/refresh_token
- login неверный пароль → 401
- login несуществующий phone → 401
- GET /auth/me без токена → 401
- GET /auth/me с токеном → 200, timezone='Asia/Novosibirsk'
- refresh rotation: старый refresh после использования → 401
- PATCH /auth/timezone 'Europe/Moscow' → 204, /auth/me показывает Europe/Moscow
- PATCH /auth/timezone 'Invalid/Zone' → 400
Использовать реальный PrismaService (не мокать).
Проверка:
bash
make test
git add . && git commit -m "feat(auth): login/refresh/me/timezone + tests"
________________________________________
Промпт 1.7 — Gyms (новый чат)
text
Создай backend/src/gyms/:
- gyms.module.ts, gyms.service.ts, gyms.controller.ts
- dto/create-gym.dto.ts (name, address @IsString, isActive? @IsBoolean)
- dto/update-gym.dto.ts (PartialType)

Все @Roles(ADMIN):
GET /admin/gyms, POST /admin/gyms → 201, GET /admin/gyms/:id, PUT /admin/gyms/:id, DELETE /admin/gyms/:id → 204 (если есть GymEquipment → 409).
Создай gyms.e2e-spec.ts: без токена 401, тренер 403, админ CRUD, delete с оборудованием 409.
Проверка:
bash
make down && make up && make test
git add . && git commit -m "feat(gyms): CRUD + tests"
________________________________________
Промпт 1.8 — Equipment + Upload (новый чат)
text
Создай backend/src/equipment/:
- dto/create-equipment.dto.ts: name @IsString, type @IsEnum(EquipmentType), minWeight? @IsNumber, maxWeight? @IsNumber, photoUrl?, description?
- Валидация: min > max → 400
- Admin: GET/POST /admin/gyms/:gymId/equipment, PUT/DELETE /admin/equipment/:id
- JWT: GET /gyms/:gymId/equipment

Создай backend/src/upload/upload.controller.ts:
POST /admin/upload (@Roles(ADMIN), FileInterceptor('file')), whitelist jpg/jpeg/png/webp, 5MB, сохранить ./uploads/{uuid}.{ext}, вернуть {url}.
Настрой ServeStaticModule /uploads.

Создай equipment.e2e-spec.ts: min>max 400, невалидный type 400, CRUD админ, GET тренером 200, upload без файла 400, .exe 400.
Проверка:
bash
make down && make up && make test
git add . && git commit -m "feat(equipment): CRUD + upload + tests"
________________________________________
Промпт 1.9 — Exercises (новый чат)
text
Создай backend/src/exercises/:
- dto: name, type @IsEnum(ExerciseType), muscleGroup?, requiresEquipment @IsBoolean, videoUrl?, description?
- Admin: GET/POST /admin/exercises, PUT/DELETE /admin/exercises/:id
- JWT: GET /exercises?type=&muscle_group=&q= (q ILIKE %q%)
Создай exercises.e2e-spec.ts: фильтр type, фильтр q, создание клиентом 403.
Проверка:
bash
make down && make up && make test
git add . && git commit -m "feat(exercises): CRUD + tests"
________________________________________
Промпт 1.10 — FoodProducts (новый чат)
text
Создай backend/src/food-products/:
- dto: name @IsString, kcal/protein/fat/carbs @IsNumber @Min(0)
- Admin: GET/POST /admin/food-products, PUT/DELETE /admin/food-products/:id
Создай food-products.e2e-spec.ts: отрицательный kcal 400, CRUD админ.
Проверка:
bash
make down && make up && make test
git add . && git commit -m "feat(food-products): CRUD + tests"
________________________________________
Промпт 1.11 — Clients + Trainers + ClientTrainers (новый чат)
text
Создай backend/src/clients/:
POST /admin/clients (@Roles ADMIN) dto {phone, name, birthdate?, goal?, notes?}.
В $transaction: проверить phone уникальность (409 если занят), создать User(role=CLIENT, passwordHash=bcrypt(env.DEFAULT_CLIENT_PASSWORD), timezone=env.DEFAULT_TIMEZONE), создать Client(userId).
Вернуть {id, userId, phone, name, ..., initial_password: env.DEFAULT_CLIENT_PASSWORD}.
GET /admin/clients с include active_trainers (ClientTrainer isActive=true). PUT/DELETE /admin/clients/:id.

Создай backend/src/trainers/ аналогично, role=TRAINER, профиль Trainer. /admin/trainers.

Создай backend/src/client-trainers/:
POST /admin/clients/:id/trainers {trainer_id, gym_id}. Проверить существование, дубль активной связи → 409. Создать ClientTrainer(isActive=true).
DELETE /admin/clients/:id/trainers/:linkId → isActive=false.

Создай clients-trainers.e2e-spec.ts: создание клиента возвращает initial_password, логин этим паролем 200, дубль phone 409, назначение тренера 201, повтор 409, деактивация isActive=false.
Проверка:
bash
make down && make up && make test
git add . && git commit -m "feat(clients-trainers): CRUD + link + tests"
________________________________________
Промпт 1.12 — Web-admin каркас (новый чат)
text
Создай web-admin/ через Vite react-ts. Установи antd react-router-dom axios @tanstack/react-query zustand.
src/api/client.ts: axios baseURL='/api/v1', interceptor Bearer, на 401 → POST /auth/refresh, повтор, при ошибке logout.
src/store/auth.ts zustand: access, refresh, user, setTokens, setUser, logout.
src/router.tsx: /login, /protected/*, ProtectedRoute.
src/pages/Login.tsx: AntD Form phone/password → /auth/login → /auth/me → navigate('/').
src/layouts/MainLayout.tsx: Layout Sider Menu (Dashboard, Тренеры, Клиенты, Залы, Тренажёры, Упражнения, Продукты, Уведомления, Чаты). Header: имя + TZ + Выход.
src/pages/Dashboard.tsx заглушка.
vite.config.ts proxy /api и /uploads → http://localhost:8080.
Dockerfile для web-admin (nginx).
Проверка: пересобрать web-admin в compose, открыть http://<IP>:3000, войти под админом.
________________________________________
Промпт 1.13 — Web-admin страницы (можно в том же чате или по одной)
Отправляйте по одному промпту за раз, после каждого — проверка в браузере:
text
Создай src/pages/Gyms/: Table (name, address, isActive), Modal-форма, useQuery(['gyms']), useMutation с invalidateQueries. 409 → message.error.
text
Создай src/pages/Equipment/: маршрут /gyms/:id/equipment. Table, Modal с Upload → POST /admin/upload.
text
Создай src/pages/Exercises/: Table + фильтры type, muscleGroup, q + CRUD.
text
Создай src/pages/FoodProducts/: Table + CRUD (InputNumber min=0).
text
Создай src/pages/Clients/ и src/pages/Trainers/: Table, кнопка Создать → Modal. После создания Modal.success "Пароль: {initial_password}". На клиенте кнопка "Тренеры" → Drawer: список связей, кнопка Назначить (Select trainer, Select gym) → POST, Отвязать → DELETE.
________________________________________
Промпт 1.14 — Smoke-тест (новый чат)
text
Создай backend/test/smoke.e2e-spec.ts:
login admin → create gym → create equipment → create exercise → create food-product → create trainer → create client → link client-trainer → GET admin/clients → GET admin/trainers. Ассертить статусы 201/200.
Финальная проверка:
bash
make down && make up && make migrate && make seed && make test
Открыть http://<IP>:3000, войти, создать зал → тренажёр → упражнение → продукт → тренера → клиента → связать.
bash
git add . && git commit -m "feat: sprint 1 complete"
________________________________________
Шпаргалка по экономии токенов
Правило	Почему
AGENTS.md в корне	OpenCode читает автоматически, не надо повторять контекст 
Ссылка @docs/er.md вместо вставки схемы	Экономит 2–3k токенов на каждом промпте
Один модуль = один чат	Меньше «мусорного» контекста из предыдущих задач
Тесты отдельным промптом	Модель не распыляется между логикой и тестами
PartialType в DTO	Не надо перечислять поля повторно
git commit после каждого зелёного	Можно откатиться, не переспрашивая модель
make test только нужного модуля	Не гонять все тесты после каждого шага
Итого: ~15 промптов на Спринт 1. Средний размер — 6–10 строк. Это ~30–40k входных токенов вместо ~150k при «сделай всё сразу».
________________________________________
Если что-то пошло не так
•	OpenCode не видит opencode → export PATH="$HOME/.opencode/bin:$PATH" и добавьте в ~/.bashrc.
•	Docker permission denied → sudo usermod -aG docker $USER && newgrp docker.
•	make test падает → откройте тот же чат с модулем и напишите: тест X падает: <ошибка>. Исправь.
•	OpenCode «расползся» (трогает лишнее) → git checkout . и переформулируйте промпт: уберите лишние требования, оставьте только файлы и сигнатуры.
Когда Спринт 1 сдан — скажите, подготовлю такую же инструкцию для Спринта 2 (шаблоны, тренировки, календарь).

