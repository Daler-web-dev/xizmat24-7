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
