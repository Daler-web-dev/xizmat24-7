-- =================================================================
-- XIZMAT24 — patch for the EXISTING database.
-- Adds birth_year + gender to workers, extends RPCs, and fills
-- Uzbek names for all categories/subcategories. Idempotent.
-- Paste this whole file into Supabase SQL Editor and Run once.
-- =================================================================

-- ===== migrations/0002_worker_birth_gender.sql =====
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

-- ===== seed/04_services_uz.sql =====
-- =====================================================================
-- XIZMAT24 — Uzbek (Latin) names for categories & subcategories.
-- Idempotent: matches by name_ru and sets name_uz. Safe to re-run.
-- Run AFTER 01_categories.sql.
-- =====================================================================

-- ----- Categories -----
update categories c set name_uz = t.uz
from (values
  ('Мастера по ремонту',      'Ta''mirlash ustalari'),
  ('Мастера по мебели',       'Mebel ustalari'),
  ('Домашний персонал',       'Uy xodimlari'),
  ('Мастера по клинингу',     'Klining ustalari'),
  ('Мастера по красоте',      'Go''zallik ustalari'),
  ('Спорт и здоровье',        'Sport va salomatlik'),
  ('Репетиторы',              'Repetitorlar'),
  ('Артисты',                 'Artistlar'),
  ('Фрилансеры',              'Frilanserlar'),
  ('Бизнес и Юриспруденция',  'Biznes va yurisprudensiya')
) as t(ru, uz)
where c.name_ru = t.ru;

-- ----- Subcategories -----
-- "Прочие услуги" repeats under every category and maps to the same UZ term;
-- matching by name_ru updates all of them at once.
update subcategories s set name_uz = t.uz
from (values
  -- 1. Мастера по ремонту
  ('Сантехника',                    'Santexnika'),
  ('Электрика',                     'Elektrika'),
  ('Плиточники',                    'Plitkachilar'),
  ('Малярные работы',               'Bo''yash ishlari'),
  ('Строители',                     'Quruvchilar'),
  ('Вентиляционные работы',         'Ventilyatsiya ishlari'),
  ('Кондиционерные работы',         'Konditsioner ishlari'),
  ('Двери и Окна',                  'Eshik va derazalar'),
  ('Потолочные работы',             'Shift ishlari'),
  ('Полы',                          'Pol ishlari'),
  ('Дизайнеры интерьера',           'Interyer dizaynerlari'),
  ('Комплексный ремонт',            'Kompleks ta''mirlash'),
  -- 2. Мастера по мебели
  ('Изготовление мебели',           'Mebel ishlab chiqarish'),
  ('Ремонт мебели',                 'Mebel ta''mirlash'),
  ('Авторская мебель',              'Mualliflik mebeli'),
  ('Обшивка мебели',                'Mebel qoplamasi'),
  -- 3. Домашний персонал
  ('Домработницы',                  'Uy ishchilari'),
  ('Повара',                        'Oshpazlar'),
  ('Водители',                      'Haydovchilar'),
  ('Сиделки и няни',                'Enagalar va parvarishchilar'),
  ('Садовники',                     'Bog''bonlar'),
  ('Охранники',                     'Qorovullar'),
  ('Услуги уборки',                 'Tozalash xizmatlari'),
  ('Официанты на выезд',            'Chaqiruv ofitsiantlari'),
  ('Грузчики',                      'Yuk tashuvchilar'),
  ('Разнорабочие',                  'Yordamchi ishchilar'),
  -- 4. Мастера по клинингу
  ('Домашняя уборка',               'Uy tozalash'),
  ('Корпоративный клининг',         'Korporativ klining'),
  ('Промышленный клининг',          'Sanoat klining'),
  ('Химчистка',                     'Kimyoviy tozalash'),
  ('Услуги прачечных',              'Kir yuvish xizmatlari'),
  ('Промышленный альпинизм',        'Sanoat alpinizmi'),
  -- 5. Мастера по красоте
  ('Мастера маникюра и педикюра',   'Manikyur va pedikyur ustalari'),
  ('Мужские парикмахеры',           'Erkaklar sartaroshi'),
  ('Женские парикмахеры',           'Ayollar sartaroshi'),
  ('Колористы',                     'Koloristlar'),
  ('Визажисты',                     'Vizajistlar'),
  ('Услуги эпиляции',               'Epilyatsiya xizmatlari'),
  ('Стилисты',                      'Stilistlar'),
  ('Косметологи',                   'Kosmetologlar'),
  ('Лешмейкеры (ресницы)',          'Leshmeykerlar (kiprik)'),
  ('Тату мастера',                  'Tatu ustalari'),
  ('Пирсинг',                       'Pirsing'),
  -- 6. Спорт и здоровье
  ('Фитнес тренера',                'Fitnes murabbiylari'),
  ('Йога и пилатес',                'Yoga va pilates'),
  ('Стретчинг',                     'Streching'),
  ('Аэробика',                      'Aerobika'),
  ('Тренера по танцам',             'Raqs murabbiylari'),
  ('Единоборства',                  'Yakkakurash'),
  ('Другие тренера',                'Boshqa murabbiylar'),
  ('Медсестры',                     'Hamshiralar'),
  ('Психологи',                     'Psixologlar'),
  ('Массаж',                        'Massaj'),
  ('Врачи',                         'Shifokorlar'),
  ('Уход за больными',              'Bemorlarni parvarish qilish'),
  ('Ветеринары',                    'Veterinarlar'),
  -- 7. Репетиторы
  ('Английский язык',               'Ingliz tili'),
  ('Другие языки',                  'Boshqa tillar'),
  ('Математика',                    'Matematika'),
  ('Физика',                        'Fizika'),
  ('Химия',                         'Kimyo'),
  ('Биология',                      'Biologiya'),
  ('История',                       'Tarix'),
  ('Русский язык',                  'Rus tili'),
  ('Литература',                    'Adabiyot'),
  ('Музыкальные инструменты',       'Musiqa asboblari'),
  ('Вокал',                         'Vokal'),
  ('Начальная школа',               'Boshlang''ich sinf'),
  ('Дошкольная подготовка',         'Maktabgacha tayyorlov'),
  -- 8. Артисты
  ('Музыканты',                     'Musiqachilar'),
  ('Певцы',                         'Qo''shiqchilar'),
  ('Танцоры',                       'Raqqoslar'),
  ('Ведущие',                       'Boshlovchilar'),
  ('Диджеи',                        'Didjeylar'),
  ('Свадебные шоу',                 'To''y shoulari'),
  ('Фокусники',                     'Fokuschilar'),
  ('Клоуны',                        'Masxarabozlar'),
  ('Аниматоры',                     'Animatorlar'),
  ('Флористы',                      'Floristlar'),
  ('Декораторы',                    'Dekoratorlar'),
  ('Хостес',                        'Xostes'),
  ('Бармены',                       'Barmenlar'),
  ('Официанты',                     'Ofitsiantlar'),
  ('Актеры для съемок',             'Suratga olish aktyorlari'),
  -- 9. Фрилансеры
  ('Дизайнеры',                     'Dizaynerlar'),
  ('Программисты',                  'Dasturchilar'),
  ('Маркетологи',                   'Marketologlar'),
  ('Мобилографы',                   'Mobilograflar'),
  ('Операторы',                     'Operatorlar'),
  ('Монтажеры',                     'Montajchilar'),
  ('Фотографы',                     'Fotograflar'),
  ('Системные администраторы',      'Tizim administratorlari'),
  ('Переводчики',                   'Tarjimonlar'),
  ('Копирайтеры',                   'Kopirayterlar'),
  ('SEO специалисты',               'SEO mutaxassislari'),
  ('Модели',                        'Modellar'),
  ('Трейдеры',                      'Treyderlar'),
  ('Тестировщики',                  'Testerlar'),
  ('3D специалисты',                '3D mutaxassislari'),
  -- 10. Бизнес и Юриспруденция
  ('Бухгалтеры',                    'Buxgalterlar'),
  ('Специалисты по продажам',       'Sotuv mutaxassislari'),
  ('Юристы',                        'Yuristlar'),
  ('Риелторы',                      'Rieltorlar'),
  ('Бизнес консультанты',           'Biznes konsultantlar'),
  ('Финансовые аналитики',          'Moliyaviy tahlilchilar'),
  ('Нотариусы',                     'Notariuslar'),
  ('Оценщики',                      'Baholovchilar'),
  ('Брокеры',                       'Brokerlar'),
  ('Страховщики',                   'Sug''urtachilar'),
  -- shared across every category
  ('Прочие услуги',                 'Boshqa xizmatlar')
) as t(ru, uz)
where s.name_ru = t.ru;
