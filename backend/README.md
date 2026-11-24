# CopyHouse

Веб-платформа-агрегатор печати. Бэкенд на NestJS и JavaScript. Сейчас работают проверка живости, регистрация, вход и загрузка PDF. Контракт остальных ручек зафиксирован в `openapi.yaml` и открывается в Swagger.

Исходники лежат в `backend/src` и написаны на JavaScript. При сборке Nest прогоняет их через компилятор: декораторы вроде `@Controller` и `@Get` сам Node не понимает. TypeScript писать не нужно.

## Что нужно

- Docker и Docker Compose
- Для локальной разработки без контейнера API: Node.js 22+

## Поднять всё одной командой

Из корня репозитория:

```bash
docker compose up --build
```

API: http://localhost:3000/api/health

Ожидаемый ответ: `{"status":"ok"}`. Swagger с зафиксированным контрактом: http://localhost:3000/api/docs. При старте контейнер применяет миграции Prisma.

Живые ручки дня 2:

- `POST /api/auth/register` — создаёт `CLIENT` или `PrintProvider`, токен не выдаёт
- `POST /api/auth/login` — возвращает JWT на 7 дней. В токене версия сессии
- `POST /api/auth/logout` — отзывает все токены этого пользователя, в том числе на других устройствах
- `GET /api/auth/me` и `PATCH /api/auth/me` — профиль и город
- `GET /api/print-points?city=Калуга` — каталог и цены без токена. С токеном город берётся из профиля
- `POST /api/documents` — PDF до 50 МБ, в ответе число страниц
- `GET /api/documents/{id}` и `GET /api/documents/{id}/file` — свои метаданные и скачивание

Остальные пути из контракта видны в Swagger и заработают в следующие дни.

PostgreSQL снаружи: `localhost:5432`, база `copyhouse`, пользователь `copyhouse`, пароль `copyhouse`.

## Локальный запуск API

Поднять только базу:

```bash
docker compose up postgres -d
```

Дальше в `backend/`:

```bash
copy .env.example .env
npm ci
npx prisma migrate dev
npm run start:dev
```

## Проверки

```bash
cd backend
npm run lint
npm test
```

## Схема базы

Источник полей — `openapi.yaml`. Деньги хранятся в копейках. PDF на диске появится вместе с загрузкой; в базе остаётся только ключ хранилища. Каталог `uploads` уже предусмотрен томом Docker.

- `users` — email, хэш пароля, город, роль `CLIENT`, `PrintProvider` или `ADMIN` и `token_version`. Открытая регистрация создаёт только первые две роли. `ADMIN` приходит сидом. Выход увеличивает `token_version`, и старые JWT перестают приниматься.
- `documents` — владелец, имя, ключ хранилища, размер и число страниц.
- `print_points` — владелец, город, адрес, часы, ставки, комиссия, статус `PENDING | APPROVED | REJECTED`. Активной точка бывает только после одобрения. Новая заявка неактивна, комиссия на старте 0.
- `quotes` и `quote_offers` — расчёт на 15 минут и цена по каждой точке города.
- `orders` — один PDF, режим, копии и снимок цены. Статусы `CREATED | PAID | PRINTING | READY | ISSUED | CANCELLED`. Код выдачи появляется только к статусу «Готов».
- `payments` — мок-оплата, один платёж на заказ, включая возврат `REFUNDED`.
- `idempotency_records` — ключ создания заказа, уникальный вместе с пользователем на 24 часа.

Клиент платит цену печати. Комиссия удерживается из этой суммы и в MVP равна нулю, поэтому итог совпадает с суммой печати.
