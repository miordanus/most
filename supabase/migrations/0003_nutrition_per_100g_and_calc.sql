-- 0003_nutrition_per_100g_and_calc.sql
-- Stored kcal/protein/fat/carbs values come from XLSX "Ккал на 100г" — i.e. per-100g,
-- not per-portion as the legacy column names implied. Rename to make that explicit,
-- then add per-portion generated columns derived from weight_g.
-- Views menu.dq_checklist + menu.dq_summary reference the old names; drop+recreate
-- against the renamed column.

begin;

drop view if exists menu.dq_summary;
drop view if exists menu.dq_checklist;

alter table menu.dishes rename column kcal    to kcal_per_100g;
alter table menu.dishes rename column protein to protein_per_100g;
alter table menu.dishes rename column fat     to fat_per_100g;
alter table menu.dishes rename column carbs   to carbs_per_100g;

alter table menu.dishes
  add column kcal_per_portion    integer generated always as (round(kcal_per_100g    * weight_g / 100.0)::int) stored,
  add column protein_per_portion integer generated always as (round(protein_per_100g * weight_g / 100.0)::int) stored,
  add column fat_per_portion     integer generated always as (round(fat_per_100g     * weight_g / 100.0)::int) stored,
  add column carbs_per_portion   integer generated always as (round(carbs_per_100g   * weight_g / 100.0)::int) stored;

create view menu.dq_checklist as
select
  id, category, name, available, featured, is_verified, verified_by_masha, mock_status,
  case
    when name is null or length(name) = 0 then 'missing'
    when name_source = 'mockup' then 'mock'
    else 'real'
  end as name_state,
  case
    when short is null or length(short) = 0 then 'missing'
    when short_source = 'mockup' then 'mock'
    else 'real'
  end as short_state,
  case
    when description is null or length(description) = 0 then 'missing'
    when description_source = 'mockup' then 'mock'
    else 'real'
  end as description_state,
  case
    when price is null then 'missing'
    when price_source = 'mockup' then 'mock'
    else 'real'
  end as price_state,
  case
    when ingredients is null or length(ingredients) = 0 then 'missing'
    when ingredients_source = 'mockup' then 'mock'
    else 'real'
  end as ingredients_state,
  case
    when kcal_per_100g is null then 'missing'
    when nutrition_source = 'mockup' then 'mock'
    else 'real'
  end as nutrition_state,
  case
    when photo_url is null then 'missing'
    when photo_source = 'mockup' then 'mock'
    else 'real'
  end as photo_state,
  case
    when not is_verified then 'not_ready'
    when is_verified and not verified_by_masha then 'pending'
    else 'done'
  end as masha_state,
  (case when name        is not null and length(name) > 0        then 1 else 0 end) +
  (case when short       is not null and length(short) > 0       then 1 else 0 end) +
  (case when description is not null and length(description) > 0 then 1 else 0 end) +
  (case when price       is not null                              then 1 else 0 end) +
  (case when ingredients is not null and length(ingredients) > 0 then 1 else 0 end) +
  (case when kcal_per_100g is not null                            then 1 else 0 end) +
  (case when photo_url   is not null                              then 1 else 0 end) as completeness
from menu.dishes d;

create view menu.dq_summary as
select
  category,
  count(*) as dishes,
  count(*) filter (where available) as available,
  avg(completeness)::numeric(4,2) as avg_completeness,
  count(*) filter (where short_state = 'missing')       as missing_short,
  count(*) filter (where description_state = 'missing') as missing_desc,
  count(*) filter (where ingredients_state = 'missing') as missing_ingr,
  count(*) filter (where nutrition_state = 'missing')   as missing_kcal,
  count(*) filter (where photo_state = 'missing')       as missing_photo,
  count(*) filter (
    where short_state = 'mock' or description_state = 'mock'
       or ingredients_state = 'mock' or nutrition_state = 'mock'
       or photo_state = 'mock'
  ) as any_mock,
  count(*) filter (where is_verified)                    as max_done,
  count(*) filter (where masha_state = 'pending')        as masha_pending,
  count(*) filter (where verified_by_masha)              as masha_done
from menu.dq_checklist
group by category
order by category;

commit;
