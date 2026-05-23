-- Data-quality engine for the menu schema.
-- Applied via Supabase MCP `apply_migration` (name: dq_columns_and_views).
-- Source values: 'menu_photo' | 'xlsx' | 'fixture' | 'manual' | 'unknown'

alter table menu.dishes
  add column if not exists name_source         text not null default 'unknown',
  add column if not exists description_source  text not null default 'unknown',
  add column if not exists ingredients_source  text not null default 'unknown',
  add column if not exists price_source        text not null default 'unknown',
  add column if not exists nutrition_source    text not null default 'unknown',
  add column if not exists photo_source        text not null default 'unknown',
  add column if not exists is_verified         boolean not null default false,
  add column if not exists weight_label        text,
  add column if not exists created_at          timestamptz not null default now(),
  add column if not exists updated_at          timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dishes_source_values_chk') then
    alter table menu.dishes
      add constraint dishes_source_values_chk
      check (
        name_source         in ('menu_photo','xlsx','fixture','manual','unknown')
        and description_source in ('menu_photo','xlsx','fixture','manual','unknown')
        and ingredients_source in ('menu_photo','xlsx','fixture','manual','unknown')
        and price_source       in ('menu_photo','xlsx','fixture','manual','unknown')
        and nutrition_source   in ('menu_photo','xlsx','fixture','manual','unknown')
        and photo_source       in ('menu_photo','xlsx','fixture','manual','unknown')
      );
  end if;
end$$;

alter table menu.dish_extras
  add column if not exists name_source   text not null default 'unknown',
  add column if not exists price_source  text not null default 'unknown',
  add column if not exists is_verified   boolean not null default false,
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists updated_at    timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dish_extras_source_values_chk') then
    alter table menu.dish_extras
      add constraint dish_extras_source_values_chk
      check (
        name_source  in ('menu_photo','xlsx','fixture','manual','unknown')
        and price_source in ('menu_photo','xlsx','fixture','manual','unknown')
      );
  end if;
end$$;

create or replace function menu.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_dishes_updated_at on menu.dishes;
create trigger trg_dishes_updated_at before update on menu.dishes
  for each row execute function menu.set_updated_at();

drop trigger if exists trg_dish_extras_updated_at on menu.dish_extras;
create trigger trg_dish_extras_updated_at before update on menu.dish_extras
  for each row execute function menu.set_updated_at();

create table if not exists menu.import_runs (
  id            bigserial primary key,
  source        text not null,
  ran_at        timestamptz not null default now(),
  rows_in       integer,
  rows_matched  integer,
  rows_inserted integer,
  notes         text
);

create table if not exists menu.nutrition_unmatched (
  id         bigserial primary key,
  raw_name   text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create or replace view menu.dq_dashboard as
select
  d.id,
  d.category,
  d.name,
  d.is_verified,
  (d.price is not null and d.price > 0)                                        as has_price,
  (d.kcal is not null and d.protein is not null
   and d.fat is not null and d.carbs is not null
   and (d.weight_g is not null or d.weight_label is not null))                 as has_nutrition,
  (d.ingredients is not null and length(trim(d.ingredients)) > 0)              as has_ingredients,
  (d.photo_url is not null and length(trim(d.photo_url)) > 0)                  as has_photo,
  (coalesce(d.photo_url,'') like '%supabase.co/storage%')                      as photo_is_supabase,
  d.name_source, d.price_source, d.nutrition_source,
  d.ingredients_source, d.photo_source, d.description_source,
  (
    (case when d.price is not null and d.price > 0 then 1 else 0 end) +
    (case when d.kcal is not null and d.protein is not null
              and d.fat is not null and d.carbs is not null then 1 else 0 end) +
    (case when d.ingredients is not null and length(trim(d.ingredients)) > 0 then 1 else 0 end) +
    (case when d.photo_url is not null and length(trim(d.photo_url)) > 0 then 1 else 0 end) +
    (case when coalesce(d.photo_url,'') like '%supabase.co/storage%' then 1 else 0 end) +
    (case when d.is_verified then 1 else 0 end)
  ) as completeness_score
from menu.dishes d;

create or replace view menu.dq_summary as
select
  c.id   as category_id,
  c.name as category_name,
  count(*)                                              as total_dishes,
  sum(case when v.has_price then 1 else 0 end)          as with_price,
  sum(case when v.has_nutrition then 1 else 0 end)      as with_nutrition,
  sum(case when v.has_ingredients then 1 else 0 end)    as with_ingredients,
  sum(case when v.has_photo then 1 else 0 end)          as with_photo,
  sum(case when v.photo_is_supabase then 1 else 0 end)  as with_supabase_photo,
  sum(case when v.is_verified then 1 else 0 end)        as verified,
  round(avg(v.completeness_score)::numeric, 2)          as avg_completeness
from menu.categories c
join menu.dq_dashboard v on v.category = c.id
group by c.id, c.name
order by c.id;
