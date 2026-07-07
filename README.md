# XIZMAT24 — Admin Seeding Mini App

Тонкий admin-инструмент (Telegram Mini App на Next.js) для ручного внесения
специалистов на платформу XIZMAT24. Backend платформы и мобильное приложение —
отдельный проект. Здесь только ввод данных админом поверх боевой Supabase-схемы.

> Полное ТЗ: [`XIZMAT24_MINIAPP_SPEC.md`](./XIZMAT24_MINIAPP_SPEC.md).

## Стек

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (PostgreSQL), доступ только из серверного кода под `service_role`
- Авторизация: валидация Telegram `initData` (HMAC) + whitelist по Telegram ID
- `libphonenumber-js` (нормализация телефона в `+998XXXXXXXXX`), `zod` (валидация)
- Деплой: Vercel

## Архитектура (коротко)

- Server actions (`src/actions/*`) ходят прямо в Supabase под `service_role`.
- Каждый action начинается с `requireAdmin(initDataRaw)` → проверка подписи + whitelist.
- Клиент берёт `initDataRaw` из `window.Telegram.WebApp` и прикладывает к каждому вызову.
- `workers` + `worker_subcategories` пишутся атомарно через Postgres-функции
  (`create_worker_with_subcategories`, `update_worker_with_subcategories`).

## 1. Локальный запуск

```bash
npm install
cp .env.example .env.local   # заполнить значения (см. ниже)
npm run dev
```

> Mini App работает только внутри Telegram (нужен подписанный `initData`).
> В обычном браузере покажется экран «Откройте через Telegram». Для реального
> теста используйте задеплоенный URL и кнопку меню бота (см. §4).

## 2. Переменные окружения

Серверные (БЕЗ `NEXT_PUBLIC_` — не попадают в клиент):

| Переменная | Описание |
|---|---|
| `BOT_TOKEN` | Токен бота от @BotFather. Нужен для проверки подписи `initData`. |
| `SUPABASE_URL` | URL проекта Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role`-ключ. Полный доступ — только сервер. |
| `ADMIN_IDS` | Telegram ID админов через запятую: `12345678,87654321`. |
| `INITDATA_MAX_AGE_SECONDS` | Срок годности `initData`, сек (по умолчанию 86400). |

Публичные:

| Переменная | Описание |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Публичный URL задеплоенной Mini App. |

## 3. Supabase: миграции и сиды

В Supabase Dashboard → **SQL Editor** выполнить по порядку:

1. `supabase/migrations/0001_init.sql` — схема, RLS, транзакционные функции.
2. `supabase/seed/01_categories.sql` — 10 категорий + подкатегории.
3. `supabase/seed/02_regions.sql` — 14 регионов Узбекистана.
4. `supabase/seed/03_tumans.sql` — туманы (районы).
5. `supabase/seed/04_services_uz.sql` — узбекские названия услуг (name_uz).

Для уже развёрнутой БД инкрементальные изменения лежат отдельно и
собраны в один файл для разового прогона:

- `supabase/migrations/0002_worker_birth_gender.sql` — поля `birth_year`,
  `gender` у `workers` + обновлённые RPC.
- `supabase/apply_update_002.sql` — 0002 + `04_services_uz.sql` одним файлом.

Все сиды идемпотентны (`on conflict do nothing`) — повторный запуск безопасен.

> **Туманы:** статикой занесены только 12 районов г. Ташкента. Туманы
> остальных регионов добавляются **через сам бот**: Главная → «Регионы» →
> выбрать регион → добавить туман (RU + UZ). Там же можно добавить новый
> город/регион и удалить туман. При желании можно дозалить достоверные
> списки и SQL-ом по шаблону в `03_tumans.sql`.

Проверка количеств после сидов:

```sql
select (select count(*) from categories)    as categories,    -- 10
       (select count(*) from subcategories) as subcategories,
       (select count(*) from regions)       as regions,        -- 14
       (select count(*) from tumans)        as tumans;
```

### CLI-вариант (опционально)

При наличии Supabase CLI и связанного проекта:

```bash
supabase db push                                   # применить миграции
psql "$DATABASE_URL" -f supabase/seed/01_categories.sql
psql "$DATABASE_URL" -f supabase/seed/02_regions.sql
psql "$DATABASE_URL" -f supabase/seed/03_tumans.sql
```

## 4. Бот в @BotFather

1. `/newbot` → создать бота, получить `BOT_TOKEN`.
2. Bot Settings → **Menu Button** (или `/setmenubutton`) → указать URL
   задеплоенной Mini App (`NEXT_PUBLIC_APP_URL`).
3. Mini App открывается из чата с ботом по кнопке меню.

Сам бот — пустая оболочка, отдельный процесс хостить не нужно.

## 5. Деплой на Vercel

1. Импортировать репозиторий в Vercel.
2. Project Settings → **Environment Variables** → прописать все переменные из §2.
3. Deploy. Полученный URL вписать в `NEXT_PUBLIC_APP_URL` и в кнопку меню бота.

## Безопасность

- `SUPABASE_SERVICE_ROLE_KEY` и `BOT_TOKEN` — только серверные env. Supabase-клиент
  импортирует `server-only`; попадание ключа в клиентский бандл = ошибка сборки.
- `user.id` берётся только из проверенного по HMAC `initData`, никогда с клиента «как есть».
- RLS включён на всех боевых таблицах; справочники открыты на `select` для anon
  (задел под будущее публичное приложение).

## Границы scope

Только ввод данных админом. НЕ здесь: backend платформы, публичный поиск,
загрузка портфолио/аватара, ручной ввод рейтинга, самоподача заявок. Подробнее —
§0 и §13 спецификации.
```
# xizmat24-7
