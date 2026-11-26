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

Ожидаемый ответ: `{"status":"ok"}`. Swagger с зафиксированным контрактом: http://localhost:3000/api/docs. При старте контейнер применяет миграции Prisma и сид.

## Учётки сида

Пароль у всех: `StrongPass1`. Город: Калуга.

| Email | Роль |
|---|---|
| `client@copyhouse.local` | `CLIENT` |
| `provider@copyhouse.local` | `PrintProvider` |
| `admin@copyhouse.local` | `ADMIN` |

В Калуге пять точек уже со статусом `APPROVED` и `isActive: true`. Клиент после входа видит их в каталоге и может загрузить PDF, запросить `POST /api/quotes`, создать `POST /api/orders` и оплатить `POST /api/orders/{id}/pay`. Повторный сид не плодит записи: `npx prisma db seed` в `backend/`.

Живые ручки:

- `POST /api/auth/register` — создаёт `CLIENT` или `PrintProvider`, токен не выдаёт
- `POST /api/auth/login` — возвращает JWT на 7 дней. В токене версия сессии
- `POST /api/auth/logout` — отзывает все токены этого пользователя, в том числе на других устройствах
- `GET /api/auth/me` и `PATCH /api/auth/me` — профиль и город
- `GET /api/print-points?city=Калуга` — каталог и цены без токена. С токеном город берётся из профиля
- `POST /api/documents` — PDF до 50 МБ, в ответе число страниц
- `POST /api/quotes` — расчёт на 15 минут: страницы × копии × ставка выбранного режима. Только `CLIENT`
- `POST /api/orders` — заказ со снимком цены. Заголовок `Idempotency-Key` обязателен. Повтор того же ключа возвращает прежний заказ
- `GET /api/orders` и `GET /api/orders/{id}` — история и один заказ клиента
- `POST /api/orders/{id}/pay` — тестовая оплата `SUCCESS` или `FAILURE`
- `POST /api/orders/{id}/cancel` — клиент отменяет только неоплаченный заказ
- `GET /api/point/orders` и действия `start`, `ready`, `issue`, `cancel` — кабинет точки
- `POST /api/print-points`, `GET /api/print-points/mine`, правка заявки и тарифов
- `POST /api/admin/print-points/{id}/approve`, `reject` и выключение точки — только `ADMIN`
- `GET /api/documents/{id}` и `GET /api/documents/{id}/file` — свои метаданные и скачивание

Swagger на `/api/docs` показывает тот же контракт.

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
npx prisma db seed
npm run start:dev
```

## Проверки

```bash
cd backend
npm run lint
npm test
```

## Сценарий в Swagger

Открыть http://localhost:3000/api/docs. Учётки сида, пароль `StrongPass1`.

1. `POST /auth/login` как `client@copyhouse.local`. Скопировать `accessToken` в Authorize.
2. `POST /documents` — PDF. Сохранить `id` и `pageCount`.
3. `POST /quotes` с этим документом, `colorMode=BW`, `copies=1`. В `offers` пять точек Калуги.
4. `POST /orders` с `quoteId`, `printPointId` выбранной точки и заголовком `Idempotency-Key` в виде UUID.
5. `POST /orders/{orderId}/pay` с `{ "outcome": "SUCCESS" }`. Статус становится `PAID`.
6. Выйти из Authorize и войти как `provider@copyhouse.local`.
7. `POST /point/orders/{orderId}/start`, затем `POST /point/orders/{orderId}/ready`.
8. Снова войти клиентом и открыть `GET /orders/{orderId}`. Там код из 6 цифр.
9. Войти владельцем и вызвать `POST /point/orders/{orderId}/issue` с этим кодом. Статус `ISSUED`.
10. `admin@copyhouse.local` нужен для `POST /admin/print-points/{id}/approve`. Пять точек сида уже одобрены, для заказа этот шаг не нужен.

## Долги второго спринта

- Боевой эквайринг вместо тестового `MOCK`.
- Уведомления о смене статуса.
- WebSocket вместо опроса `GET /orders/{id}`.
- Загрузка не только PDF.
- Карта, расстояние, отзывы и промокоды.

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
