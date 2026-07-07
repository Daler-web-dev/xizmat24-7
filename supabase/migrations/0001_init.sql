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
  birth_year    int  check (birth_year is null or birth_year between 1900 and 2100),
  gender        text check (gender is null or gender in ('male','female')),
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
  p_subcategory_ids int[],
  p_birth_year     int  default null,
  p_gender         text default null
) returns uuid
language plpgsql
as $$
declare
  v_id  uuid;
  v_sub int;
begin
  insert into workers (name, phone, birth_year, gender, region_id, tuman_id, rate, rate_type, added_by)
  values (p_name, p_phone, p_birth_year, p_gender, p_region_id, p_tuman_id, p_rate, p_rate_type, p_added_by)
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
  p_subcategory_ids int[],
  p_birth_year     int  default null,
  p_gender         text default null
) returns uuid
language plpgsql
as $$
declare
  v_sub int;
begin
  update workers
     set name = p_name,
         phone = p_phone,
         birth_year = p_birth_year,
         gender = p_gender,
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
