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
