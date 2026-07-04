-- =================================================================
-- XIZMAT24 — combined apply script (migration + all seeds).
-- Generated for one-shot paste into Supabase SQL Editor.
-- Run order inside: schema -> categories -> regions -> tumans.
-- Idempotent: safe to re-run.
-- =================================================================

-- ===== 1/4: supabase/migrations/0001_init.sql =====
-- =====================================================================
-- XIZMAT24 — initial schema (production-grade, designed to outlast the
-- seeding Mini App). Two-level category hierarchy: 10 main -> subcategories.
-- A worker is linked to subcategories (leaves); the main category is
-- derived via the parent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3.1 Reference tables (seeded once)
-- ---------------------------------------------------------------------

create table if not exists regions (
  id          serial primary key,
  name_ru     text not null,
  name_uz     text not null,
  sort_order  int  not null default 0,
  unique (name_ru)                       -- natural key for idempotent seeding
);

create table if not exists tumans (
  id          serial primary key,
  region_id   int  not null references regions(id) on delete restrict,
  name_ru     text not null,
  name_uz     text not null,
  sort_order  int  not null default 0,
  unique (region_id, name_ru)            -- natural key for idempotent seeding
);
create index if not exists idx_tumans_region on tumans(region_id);

create table if not exists categories (
  id          serial primary key,
  name_ru     text not null,
  name_uz     text,
  sort_order  int  not null default 0,
  unique (name_ru)                       -- natural key for idempotent seeding
);

create table if not exists subcategories (
  id          serial primary key,
  category_id int  not null references categories(id) on delete restrict,
  name_ru     text not null,
  name_uz     text,
  sort_order  int  not null default 0,
  unique (category_id, name_ru)          -- "Прочие услуги" repeats per category — OK
);
create index if not exists idx_subcategories_category on subcategories(category_id);

-- ---------------------------------------------------------------------
-- 3.2 Production tables
-- ---------------------------------------------------------------------

create table if not exists workers (
  id            uuid primary key default gen_random_uuid(),

  -- Entered by the Mini App (minimum during the seeding phase):
  name          text not null,
  phone         text not null unique,          -- strictly +998XXXXXXXXX, FUTURE LOGIN
  region_id     int  references regions(id) on delete set null,
  tuman_id      int  references tumans(id)  on delete set null,
  rate          numeric,
  rate_type     text check (rate_type in ('day','task','hour') or rate_type is null),

  -- Service fields (set automatically by the server):
  added_by      bigint not null,                -- Telegram ID of the admin (from initData)
  status        text not null default 'seeded', -- seeded | active
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- For the future: filled in by the specialist via the app (nullable, Mini App does NOT touch):
  avatar_url    text,
  bio           text,
  experience    text,
  language      text,
  rating        numeric,                        -- CACHE from reviews (AVG); null on seeds
  priority      int default 0                   -- manual "show higher" flag
);
create unique index if not exists idx_workers_phone on workers(phone);

create table if not exists worker_subcategories (
  worker_id      uuid not null references workers(id) on delete cascade,
  subcategory_id int  not null references subcategories(id) on delete restrict,
  primary key (worker_id, subcategory_id)
);

create table if not exists worker_portfolio (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references workers(id) on delete cascade,
  url         text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references workers(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  author      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_reviews_worker on reviews(worker_id);

-- ---------------------------------------------------------------------
-- updated_at trigger for workers
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_workers_updated_at on workers;
create trigger trg_workers_updated_at
  before update on workers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Transactional RPCs: worker + its subcategories in one transaction.
-- A plpgsql function body runs atomically — any error rolls back both
-- the workers row and the worker_subcategories rows.
-- ---------------------------------------------------------------------

create or replace function create_worker_with_subcategories(
  p_name           text,
  p_phone          text,
  p_region_id      int,
  p_tuman_id       int,
  p_rate           numeric,
  p_rate_type      text,
  p_added_by       bigint,
  p_subcategory_ids int[]
) returns uuid
language plpgsql
as $$
declare
  v_id  uuid;
  v_sub int;
begin
  insert into workers (name, phone, region_id, tuman_id, rate, rate_type, added_by)
  values (p_name, p_phone, p_region_id, p_tuman_id, p_rate, p_rate_type, p_added_by)
  returning id into v_id;

  foreach v_sub in array p_subcategory_ids loop
    insert into worker_subcategories (worker_id, subcategory_id)
    values (v_id, v_sub);
  end loop;

  return v_id;
end;
$$;

create or replace function update_worker_with_subcategories(
  p_id             uuid,
  p_name           text,
  p_phone          text,
  p_region_id      int,
  p_tuman_id       int,
  p_rate           numeric,
  p_rate_type      text,
  p_subcategory_ids int[]
) returns uuid
language plpgsql
as $$
declare
  v_sub int;
begin
  update workers
     set name = p_name,
         phone = p_phone,
         region_id = p_region_id,
         tuman_id = p_tuman_id,
         rate = p_rate,
         rate_type = p_rate_type
   where id = p_id;

  if not found then
    raise exception 'worker % not found', p_id;
  end if;

  -- Replace the full subcategory set atomically.
  delete from worker_subcategories where worker_id = p_id;

  foreach v_sub in array p_subcategory_ids loop
    insert into worker_subcategories (worker_id, subcategory_id)
    values (p_id, v_sub);
  end loop;

  return p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 3.3 Row Level Security
-- The Mini App talks to Postgres under service_role from server code,
-- which BYPASSES RLS. Policies here are the groundwork for the future
-- public app. Production tables are closed by default. Reference tables
-- are open for anon SELECT (catalog data the future app will read).
-- ---------------------------------------------------------------------

alter table workers              enable row level security;
alter table worker_subcategories enable row level security;
alter table worker_portfolio     enable row level security;
alter table reviews              enable row level security;

alter table regions       enable row level security;
alter table tumans        enable row level security;
alter table categories    enable row level security;
alter table subcategories enable row level security;

-- Reference tables: readable by anon (catalog).
drop policy if exists "regions_anon_select" on regions;
create policy "regions_anon_select" on regions
  for select to anon, authenticated using (true);

drop policy if exists "tumans_anon_select" on tumans;
create policy "tumans_anon_select" on tumans
  for select to anon, authenticated using (true);

drop policy if exists "categories_anon_select" on categories;
create policy "categories_anon_select" on categories
  for select to anon, authenticated using (true);

drop policy if exists "subcategories_anon_select" on subcategories;
create policy "subcategories_anon_select" on subcategories
  for select to anon, authenticated using (true);

-- Production tables: NO anon/authenticated policies on purpose.
-- Only service_role (server code) can read/write for now.

-- ===== 2/4: supabase/seed/01_categories.sql =====
-- =====================================================================
-- XIZMAT24 — categories + subcategories seed (idempotent).
-- 10 main categories -> subcategories. "Прочие услуги" is a separate
-- row under EACH category (by design). Canon fix: category #4 is
-- "Мастера по клинингу".
-- Re-runnable: relies on unique(name_ru) / unique(category_id, name_ru).
-- =====================================================================

-- ----- Main categories -----
insert into categories (name_ru, sort_order) values
  ('Мастера по ремонту',        1),
  ('Мастера по мебели',         2),
  ('Домашний персонал',         3),
  ('Мастера по клинингу',       4),
  ('Мастера по красоте',        5),
  ('Спорт и здоровье',          6),
  ('Репетиторы',                7),
  ('Артисты',                   8),
  ('Фрилансеры',                9),
  ('Бизнес и Юриспруденция',    10)
on conflict (name_ru) do nothing;

-- ----- Subcategories -----
-- Helper pattern: cross join the parent category by name, then insert
-- the list of leaves. on conflict (category_id, name_ru) keeps it idempotent.

-- 1. Мастера по ремонту
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Сантехника', 1),
  ('Электрика', 2),
  ('Плиточники', 3),
  ('Малярные работы', 4),
  ('Строители', 5),
  ('Вентиляционные работы', 6),
  ('Кондиционерные работы', 7),
  ('Двери и Окна', 8),
  ('Потолочные работы', 9),
  ('Полы', 10),
  ('Дизайнеры интерьера', 11),
  ('Комплексный ремонт', 12),
  ('Прочие услуги', 13)
) as x(name_ru, sort_order)
where c.name_ru = 'Мастера по ремонту'
on conflict (category_id, name_ru) do nothing;

-- 2. Мастера по мебели
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Изготовление мебели', 1),
  ('Ремонт мебели', 2),
  ('Авторская мебель', 3),
  ('Обшивка мебели', 4),
  ('Прочие услуги', 5)
) as x(name_ru, sort_order)
where c.name_ru = 'Мастера по мебели'
on conflict (category_id, name_ru) do nothing;

-- 3. Домашний персонал
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Домработницы', 1),
  ('Повара', 2),
  ('Водители', 3),
  ('Сиделки и няни', 4),
  ('Садовники', 5),
  ('Охранники', 6),
  ('Услуги уборки', 7),
  ('Официанты на выезд', 8),
  ('Грузчики', 9),
  ('Разнорабочие', 10),
  ('Прочие услуги', 11)
) as x(name_ru, sort_order)
where c.name_ru = 'Домашний персонал'
on conflict (category_id, name_ru) do nothing;

-- 4. Мастера по клинингу
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Домашняя уборка', 1),
  ('Корпоративный клининг', 2),
  ('Промышленный клининг', 3),
  ('Химчистка', 4),
  ('Услуги прачечных', 5),
  ('Промышленный альпинизм', 6),
  ('Прочие услуги', 7)
) as x(name_ru, sort_order)
where c.name_ru = 'Мастера по клинингу'
on conflict (category_id, name_ru) do nothing;

-- 5. Мастера по красоте
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Мастера маникюра и педикюра', 1),
  ('Мужские парикмахеры', 2),
  ('Женские парикмахеры', 3),
  ('Колористы', 4),
  ('Визажисты', 5),
  ('Услуги эпиляции', 6),
  ('Стилисты', 7),
  ('Косметологи', 8),
  ('Лешмейкеры (ресницы)', 9),
  ('Тату мастера', 10),
  ('Пирсинг', 11),
  ('Прочие услуги', 12)
) as x(name_ru, sort_order)
where c.name_ru = 'Мастера по красоте'
on conflict (category_id, name_ru) do nothing;

-- 6. Спорт и здоровье
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Фитнес тренера', 1),
  ('Йога и пилатес', 2),
  ('Стретчинг', 3),
  ('Аэробика', 4),
  ('Тренера по танцам', 5),
  ('Единоборства', 6),
  ('Другие тренера', 7),
  ('Медсестры', 8),
  ('Психологи', 9),
  ('Массаж', 10),
  ('Врачи', 11),
  ('Уход за больными', 12),
  ('Ветеринары', 13),
  ('Прочие услуги', 14)
) as x(name_ru, sort_order)
where c.name_ru = 'Спорт и здоровье'
on conflict (category_id, name_ru) do nothing;

-- 7. Репетиторы
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Английский язык', 1),
  ('Другие языки', 2),
  ('Математика', 3),
  ('Физика', 4),
  ('Химия', 5),
  ('Биология', 6),
  ('История', 7),
  ('Русский язык', 8),
  ('Литература', 9),
  ('Музыкальные инструменты', 10),
  ('Вокал', 11),
  ('Начальная школа', 12),
  ('Дошкольная подготовка', 13),
  ('Прочие услуги', 14)
) as x(name_ru, sort_order)
where c.name_ru = 'Репетиторы'
on conflict (category_id, name_ru) do nothing;

-- 8. Артисты
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Музыканты', 1),
  ('Певцы', 2),
  ('Танцоры', 3),
  ('Ведущие', 4),
  ('Диджеи', 5),
  ('Свадебные шоу', 6),
  ('Фокусники', 7),
  ('Клоуны', 8),
  ('Аниматоры', 9),
  ('Флористы', 10),
  ('Декораторы', 11),
  ('Хостес', 12),
  ('Бармены', 13),
  ('Официанты', 14),
  ('Актеры для съемок', 15),
  ('Прочие услуги', 16)
) as x(name_ru, sort_order)
where c.name_ru = 'Артисты'
on conflict (category_id, name_ru) do nothing;

-- 9. Фрилансеры
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Дизайнеры', 1),
  ('Программисты', 2),
  ('Маркетологи', 3),
  ('Мобилографы', 4),
  ('Операторы', 5),
  ('Монтажеры', 6),
  ('Фотографы', 7),
  ('Системные администраторы', 8),
  ('Переводчики', 9),
  ('Копирайтеры', 10),
  ('SEO специалисты', 11),
  ('Модели', 12),
  ('Трейдеры', 13),
  ('Тестировщики', 14),
  ('3D специалисты', 15),
  ('Прочие услуги', 16)
) as x(name_ru, sort_order)
where c.name_ru = 'Фрилансеры'
on conflict (category_id, name_ru) do nothing;

-- 10. Бизнес и Юриспруденция
insert into subcategories (category_id, name_ru, sort_order)
select c.id, x.name_ru, x.sort_order
from categories c
cross join (values
  ('Бухгалтеры', 1),
  ('Специалисты по продажам', 2),
  ('Юристы', 3),
  ('Риелторы', 4),
  ('Бизнес консультанты', 5),
  ('Финансовые аналитики', 6),
  ('Нотариусы', 7),
  ('Оценщики', 8),
  ('Брокеры', 9),
  ('Страховщики', 10),
  ('Прочие услуги', 11)
) as x(name_ru, sort_order)
where c.name_ru = 'Бизнес и Юриспруденция'
on conflict (category_id, name_ru) do nothing;

-- ===== 3/4: supabase/seed/02_regions.sql =====
-- =====================================================================
-- XIZMAT24 — regions seed (idempotent). 14 subjects of Uzbekistan.
-- Re-runnable: relies on unique(name_ru).
-- =====================================================================

insert into regions (name_ru, name_uz, sort_order) values
  ('г. Ташкент',                'Toshkent shahri',                1),
  ('Ташкентская область',       'Toshkent viloyati',              2),
  ('Андижанская область',       'Andijon viloyati',               3),
  ('Бухарская область',         'Buxoro viloyati',                4),
  ('Джизакская область',        'Jizzax viloyati',                5),
  ('Кашкадарьинская область',   'Qashqadaryo viloyati',           6),
  ('Навоийская область',        'Navoiy viloyati',                7),
  ('Наманганская область',      'Namangan viloyati',              8),
  ('Самаркандская область',     'Samarqand viloyati',             9),
  ('Сурхандарьинская область',  'Surxondaryo viloyati',           10),
  ('Сырдарьинская область',     'Sirdaryo viloyati',              11),
  ('Ферганская область',        'Farg''ona viloyati',             12),
  ('Хорезмская область',        'Xorazm viloyati',                13),
  ('Республика Каракалпакстан', 'Qoraqalpog''iston Respublikasi', 14)
on conflict (name_ru) do nothing;

-- ===== 4/4: supabase/seed/03_tumans.sql =====
-- =====================================================================
-- XIZMAT24 — tumans (districts) seed (idempotent).
-- Re-runnable: relies on unique(region_id, name_ru).
--
-- IMPORTANT: do NOT invent district names. Only verified entries are
-- seeded here (the 12 districts of Tashkent city). Districts for the other
-- regions are added at runtime by an admin through the Mini App
-- (Главная → «Регионы» → выбрать регион → добавить туман), so they are
-- intentionally NOT seeded statically.
--
-- This file remains a convenient starter; you may still bulk-insert
-- verified lists here using the pattern below if you prefer SQL.
--
-- Insert pattern: join the parent region by name_ru, then list districts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- г. Ташкент — 12 city districts (confirmed, per spec)
-- ---------------------------------------------------------------------
insert into tumans (region_id, name_ru, name_uz, sort_order)
select r.id, x.name_ru, x.name_uz, x.sort_order
from regions r
cross join (values
  ('Юнусабадский район',      'Yunusobod tumani',     1),
  ('Чиланзарский район',      'Chilonzor tumani',     2),
  ('Мирзо-Улугбекский район', 'Mirzo Ulug''bek tumani', 3),
  ('Яккасарайский район',     'Yakkasaroy tumani',    4),
  ('Мирабадский район',       'Mirobod tumani',       5),
  ('Шайхантахурский район',   'Shayxontohur tumani',  6),
  ('Алмазарский район',       'Olmazor tumani',       7),
  ('Бектемирский район',      'Bektemir tumani',      8),
  ('Сергелийский район',      'Sergeli tumani',       9),
  ('Учтепинский район',       'Uchtepa tumani',       10),
  ('Яшнабадский район',       'Yashnobod tumani',     11),
  ('Янгихаётский район',      'Yangihayot tumani',    12)
) as x(name_ru, name_uz, sort_order)
where r.name_ru = 'г. Ташкент'
on conflict (region_id, name_ru) do nothing;

-- ---------------------------------------------------------------------
-- Other regions: add their tumans via the Mini App at runtime, OR bulk
-- seed verified lists here using this pattern (matching the region by
-- name_ru exactly as seeded in 02_regions.sql):
--
--   insert into tumans (region_id, name_ru, name_uz, sort_order)
--   select r.id, x.name_ru, x.name_uz, x.sort_order
--   from regions r
--   cross join (values
--     ('<Район_ru>', '<Tuman_uz>', 1),
--     ...
--   ) as x(name_ru, name_uz, sort_order)
--   where r.name_ru = '<Регион_ru>'
--   on conflict (region_id, name_ru) do nothing;
-- ---------------------------------------------------------------------
