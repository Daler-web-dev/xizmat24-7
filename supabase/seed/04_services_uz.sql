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
