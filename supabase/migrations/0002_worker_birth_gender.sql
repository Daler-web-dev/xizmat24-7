-- =====================================================================
-- XIZMAT24 — migration 0002: add birth_year + gender to workers, and
-- extend the transactional RPCs to accept them. Idempotent / re-runnable.
-- Apply to an already-initialized database (0001 already run).
-- =====================================================================

-- ----- New nullable worker columns -----
alter table workers add column if not exists birth_year int;
alter table workers add column if not exists gender     text;

-- Constraints (guarded so re-runs don't error).
alter table workers drop constraint if exists workers_birth_year_check;
alter table workers add  constraint workers_birth_year_check
  check (birth_year is null or birth_year between 1900 and 2100);

alter table workers drop constraint if exists workers_gender_check;
alter table workers add  constraint workers_gender_check
  check (gender is null or gender in ('male','female'));

-- ----- Recreate RPCs with the two new (optional) params -----
-- Drop the old signatures first: adding parameters changes the signature,
-- so CREATE OR REPLACE alone would leave a stale overload behind.
drop function if exists create_worker_with_subcategories(
  text, text, int, int, numeric, text, bigint, int[]
);
drop function if exists update_worker_with_subcategories(
  uuid, text, text, int, int, numeric, text, int[]
);

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

  delete from worker_subcategories where worker_id = p_id;

  foreach v_sub in array p_subcategory_ids loop
    insert into worker_subcategories (worker_id, subcategory_id)
    values (p_id, v_sub);
  end loop;

  return p_id;
end;
$$;
