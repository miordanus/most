-- 0004_category_remap.sql
-- Source of truth: the printed paper menu (most_menu.xlsx, sheet "Меню").
--
-- The initial seed (un-checked-in migrations 0001/0002) over-split the menu into 13
-- categories, scattering dishes into phantom sections. The paper menu has only 8 categories
-- and deliberately keeps things together:
--   * Крылья live under Закуски
--   * Паста lives under «Еда» (the hot-food section is titled «Еда», not «Горячее»)
--   * Рёбра live under Мангал
--   * Картофель/батат фри live under Закуски (there is no Гарниры section)
--   * There is no Рис on the menu
-- This migration collapses the DB back to the paper-menu structure. Dish NAMES are untouched.

BEGIN;

-- 1. Hot-food section is titled «Еда» on the paper menu (slug stays `mains`).
UPDATE menu.categories SET name = 'Еда' WHERE id = 'mains';

-- 2. Крылья → Закуски.
UPDATE menu.dishes SET category = 'snacks', updated_at = now()
 WHERE id IN ('d6','d35','d36','d37');

-- 3. Паста → Еда.
UPDATE menu.dishes SET category = 'mains', updated_at = now()
 WHERE id IN ('d20','d21');

-- 4. Картофель фри: keep the two photographed split records, move them to Закуски;
--    deactivate the photo-less combined duplicate (founder's call — keep the splits).
UPDATE menu.dishes SET category = 'snacks', updated_at = now()
 WHERE id IN ('d27','d28');               -- Картофель фри, Картофель по-деревенски
UPDATE menu.dishes SET available = false, updated_at = now()
 WHERE id = 'nx-dca54128e9';              -- Картофель фри или по-деревенски (combined dup)

-- 5. Рис is not on the paper menu → delete the two dishes (no dish_extras reference them;
--    must remove before dropping the category due to dishes_category_fkey).
DELETE FROM menu.dishes WHERE id IN ('d15','d16');

-- 6. Drop the phantom categories (now empty after the reassignments above).
DELETE FROM menu.categories WHERE id IN ('pasta','ribs','wings','rice','sides');

-- 7. Re-sort the 8 canonical categories into paper-menu order.
UPDATE menu.categories SET sort_order = 10 WHERE id = 'snacks';      -- Закуски
UPDATE menu.categories SET sort_order = 20 WHERE id = 'salads';      -- Салаты
UPDATE menu.categories SET sort_order = 30 WHERE id = 'soups';       -- Супы
UPDATE menu.categories SET sort_order = 40 WHERE id = 'burgers';     -- Бургеры
UPDATE menu.categories SET sort_order = 50 WHERE id = 'sandwiches';  -- Сэндвичи и брускетты
UPDATE menu.categories SET sort_order = 60 WHERE id = 'mains';       -- Еда
UPDATE menu.categories SET sort_order = 70 WHERE id = 'grill';       -- Мангал
UPDATE menu.categories SET sort_order = 80 WHERE id = 'desserts';    -- Десерты

-- 8. Audit row.
INSERT INTO menu.import_runs (source, ran_at, notes)
VALUES (
  'manual',
  now(),
  'Category remap to paper menu (most_menu.xlsx): wings→Закуски, pasta→Еда, potato splits→Закуски + deactivate combined dup, delete Рис dishes, drop pasta/ribs/wings/rice/sides categories, rename Горячее→Еда.'
);

COMMIT;
