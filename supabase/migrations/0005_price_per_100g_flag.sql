-- 0005_price_per_100g_flag.sql
-- Menu polish pass (founder feedback):
--   1. Highlight per-100g pricing separately. Until now the "цена за 100 г" note for steaks/ribs
--      lived buried in the faint grey `short` line. We add a real `price_per_100g` flag and the
--      public menu renders a quiet "/100 г" suffix next to the price instead.
--   2. Trim redundant `short` descriptions where the composition is obvious from the name
--      (most Закуски, all Сэндвичи, many Салаты, Еда, Мангал). Kept where listing contents adds
--      value: Соленья, Сыр/Мясо/Рыба тарелки, Вителло тоннато, Баварский салат, Мороженое, and
--      all burgers (the build matters and isn't in the name).
--   3. Pork ribs are NOT served with «картофель по-деревенски» — strip that from short + desc.
--
-- Applied to remote via MCP apply_migration; this file keeps the repo in sync.

BEGIN;

ALTER TABLE menu.dishes ADD COLUMN IF NOT EXISTS price_per_100g boolean NOT NULL DEFAULT false;

-- (1) flag per-100g dishes: 6 steaks/beef-rib/ossobuco + all 3 pork ribs (270 ₽ за 100 г)
UPDATE menu.dishes SET price_per_100g = true
WHERE id IN ('nx-fa00b5f815','nx-9a84e2c763','nx-ed8f19654d','nx-010bbf8d8c','nx-36cf0b742c','nx-2c421a26fd','d17','d18','d19');

-- (2) drop redundant short descriptions (composition obvious from name)
UPDATE menu.dishes
SET short = '', short_source = 'manual'
WHERE id IN (
  -- Закуски
  'nx-b84d399ec4','d6','d29','d35','d27','d28','d31','d36','d37','d32','d33','d26','d30','d34','nx-c049fb926c',
  -- Салаты
  'nx-f4391df363','nx-4caab83b88','nx-ed87042546','nx-ece1e944c6','nx-380013906c','nx-1cb3c67def','nx-341604cd4b','nx-39d3503b8b','nx-83824a888e',
  -- Сэндвичи и брускетты
  'd5','nx-03537d72a6','nx-43c2969b98','d12','d14','nx-e77f79f305',
  -- Еда
  'd20','d21','d25','d24','d23','nx-f62ef5c7e2','nx-82bb561c21','d7','nx-8a01c85556','nx-68ab74633d','nx-2c37e33cd3',
  -- Мангал
  'nx-00b2777751','d17','d18','d19','nx-fa00b5f815','nx-9a84e2c763','nx-ed8f19654d','nx-010bbf8d8c','nx-36cf0b742c','nx-2c421a26fd','nx-843a594ffb','nx-29463716e9','nx-d185766350','nx-28fb1a4aaf',
  -- Десерты
  'nx-3fb7eb3640','nx-8dc46b929a','nx-2f22b99be9'
);

-- (3) strip "картофель по-деревенски" from pork-ribs descriptions (d19 had none)
UPDATE menu.dishes SET description = 'Свиные рёбра 6 часов с дымным маринадом чипотл.', description_source = 'manual' WHERE id = 'd17';
UPDATE menu.dishes SET description = 'Свиные рёбра в плотном глазе терияки.', description_source = 'manual' WHERE id = 'd18';

INSERT INTO menu.import_runs (source, rows_matched, notes)
VALUES ('manual', 67,
  'menu polish: dropped 58 redundant short descriptions; stripped "картофель по-деревенски" from ribs (d17/d18 desc + d17/d18/d19 short); added+set price_per_100g flag on 9 grill items (6 steaks + 3 pork ribs).');

COMMIT;
