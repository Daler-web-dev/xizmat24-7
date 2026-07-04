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
