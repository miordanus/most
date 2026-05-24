# Nutrition basis audit — 2026-05-24

73 dishes with non-null kcal. Goal: classify each row's basis as `per_100g`, `per_portion`, or `ambiguous` so a future calc layer can normalize to per-portion for display.

## Method

For each row, two interpretations are computed:
- **as per-100g** → portion total = stored × weight / 100
- **as per-portion** → density = stored × 100 / weight

Each is compared against typical kcal-density ranges:

| Food family | Typical kcal/100g |
|---|---|
| Leafy salad with dressing/protein | 40–200 |
| Soup (clear/borscht) | 30–80 |
| Soup (cream) | 60–120 |
| Cooked pasta with sauce | 130–220 |
| Fried rice with proteins | 150–230 |
| Burger (full) | 220–320 |
| Fries / roasted potatoes | 200–320 |
| Bruschetta / sandwich | 180–280 |
| Ribs + fries | 200–280 |
| Wings with sauce | 200–280 |
| Steak (lean cooked) | 200–300 |
| Deep-fried snacks (rings, balls, cheese) | 250–400 |
| Cheesecake / dense dessert | 230–400 |
| Ice cream | 180–250 |

Hard impossibility: kcal/100g > 900 is physically impossible (pure fat ceiling).

Confidence tiers:
- **HIGH** — one interpretation gives an impossible value (>900) OR is well outside the typical range, the other lands cleanly in range.
- **MED** — one interpretation lands in range, the other is borderline.
- **LOW** — both interpretations are plausible; needs human eyeball or domain knowledge.

---

## Summary

| Basis guess | Count | Notes |
|---|---:|---|
| `per_portion` HIGH | 16 | All "smoking-gun" rows where per-100g is impossible |
| `per_portion` MED  |  3 | Stronger lean per-portion; per-100g borderline |
| `per_100g`   HIGH | 35 | Per-portion would be implausibly low density |
| `per_100g`   MED  |  6 | Lean per-100g; per-portion borderline |
| **ambiguous**     | 13 | Both interpretations plausible — need a decision |

---

## per_portion — HIGH confidence (16 rows)

These rows have stored kcal that would be physically impossible or unrealistically high as per-100g; only per-portion makes sense.

| id | name | wt(g) | kcal | as per-portion density | reasoning |
|---|---|---:|---:|---:|---|
| d8 | Вишнёвый бургер | 310 | 770 | 248 | per-100g=770 (>any burger), per-portion=248 fits burger |
| d22 | Котлета с картофельным пюре | 320 | 620 | 194 | per-100g impossible for meat+mash (max ~250) |
| d25 | Фиш энд чипс | 350 | 760 | 217 | per-100g=760 impossible |
| d21 | Паста с креветками сливочн. | 320 | 700 | 219 | per-100g=700 impossible for pasta |
| d20 | Паста с лососем сливочн. | 320 | 740 | 231 | per-100g=740 impossible for pasta |
| d19 | Рёбрышки барбекю + картоф. | 420 | 940 | 224 | per-100g=940 exceeds fat ceiling (~900) |
| d17 | Рёбрышки чипотл + картоф. | 420 | 920 | 219 | per-100g=920 exceeds fat ceiling |
| d18 | Рёбрышки терияки + картоф. | 420 | 900 | 214 | per-100g=900 at ceiling — impossible |
| d15 | Жареный рис с курицей | 320 | 580 | 181 | per-100g=580 too high for fried rice (max ~220) |
| d16 | Жареный рис с морепродуктами | 320 | 600 | 188 | per-100g=600 too high for fried rice |
| d5 | Клаб-сэндвич с куриным филе | 320 | 720 | 225 | per-100g=720 impossible for sandwich |
| d33 | Картоф. шарики бекон сыр халапеньо | 240 | 620 | 258 | per-100g=620 too high for fried food (max ~450) |
| nx-6b609ecd5d | Соленья | 350 | 225 | 64 | per-100g=225 absurd for pickled veg (real 20-60) |
| nx-8a66beaf92 | Борщ с гренками и салом | 450 | 178 | 40 | per-100g=178 way above borscht (max ~80) |
| nx-835e13f5a0 | Крем-суп тыква креветки | 330 | 150 | 45 | per-100g=150 too high for cream soup |
| nx-ad9f2c53b1 | Куриный суп-лапша | 400 | 101 | 25 | per-100g=101 too high for chicken noodle |

---

## per_portion — MED confidence (3 rows)

Per-100g is implausible but not impossible; per-portion fits cleanly.

| id | name | wt(g) | kcal | as per-portion density | reasoning |
|---|---|---:|---:|---:|---|
| nx-85ccf8c2b1 | Крем-суп шампиньонов | 400 | 107 | 27 | per-100g=107 high for mushroom soup; per-portion=27 a touch light but fits clear soup |
| d13 | Брускетта лосось с сыром | 220 | 480 | 218 | per-100g=480 high for bruschetta (max ~350); per-portion=218 fits |
| d26 | Батат фри с блю-чиз | 220 | 480 | 218 | per-100g=480 high for fries (max ~350); per-portion=218 fits sweet-potato fries |

---

## per_100g — HIGH confidence (35 rows)

Per-portion interpretation gives implausibly low densities (under ~80 for substantive cooked dishes); per-100g lands in typical range.

| id | name | wt(g) | kcal | as per-100g portion total | reasoning |
|---|---|---:|---:|---:|---|
| d1 | Барбекю Бургер | 345 | 202 | 697 | per-portion d=59 impossible for burger |
| nx-0e20fb1cc2 | Вагю бургер | 320 | 140 | 448 | per-portion d=44 impossible |
| nx-baeddc60b4 | Грибной бургер | 350 | 191 | 669 | per-portion d=55 impossible |
| nx-b6951367e3 | Демиглас бургер | 360 | 160 | 576 | per-portion d=44 impossible |
| d9 | Итальянский бургер | 310 | 210 | 651 | per-portion d=68 impossible |
| d11 | Острый бургер | 355 | 192 | 682 | per-portion d=54 impossible |
| nx-af500558ae | Слоу бургер | 360 | 191 | 688 | per-portion d=53 impossible |
| d3 | Тейсти бургер | 330 | 160 | 528 | per-portion d=48 impossible |
| d4 | Французский бургер | 350 | 226 | 791 | per-portion d=65 impossible |
| d2 | Чизбургер | 340 | 161 | 547 | per-portion d=47 impossible |
| d10 | Чикенбургер | 340 | 163 | 554 | per-portion d=48 impossible |
| nx-ee42310271 | Мороженое | 150 | 226 | 339 | per-100g=226 perfect for ice cream |
| nx-2f22b99be9 | Штрудель с пломбиром | 340 | 297 | 1010 | per-portion d=87 too low for strudel+ice cream |
| nx-28fb1a4aaf | Овощи гриль | 150 | 57 | 86 | per-portion d=38 too low for oiled veg |
| nx-ed8f19654d | Стейк Рибай | null | 265 | n/a | weight null; 265/100g fits ribeye |
| nx-9a84e2c763 | Стейк Стриплойн | null | 226 | n/a | weight null; 226/100g fits striploin |
| nx-010bbf8d8c | Стейк Филе миньон | null | 145 | n/a | weight null; 145/100g fits lean fillet |
| d23 | Бефстроганов с пюре | 380 | 171 | 650 | per-portion d=45 impossible |
| nx-82bb561c21 | Буженина с горчицей | 210 | 296 | 622 | per-portion d=141 too low for pork shoulder |
| d24 | Говяжьи щёчки + пюре + демиглас | 390 | 148 | 577 | per-portion d=38 impossible |
| xu-11 | Окорок свиной в пиве | 360 | 203 | 731 | per-portion d=56 impossible |
| nx-8a01c85556 | Паста 5 сыров | 300 | 220 | 660 | per-portion d=73 too low for cheesy pasta |
| xu-12 | Паста болоньезе | 340 | 143 | 486 | per-portion d=42 too low |
| d7 | Паста карбонара | 340 | 223 | 758 | per-portion d=66 too low |
| xu-13 | Паста с тигровыми креветками томатн. | 350 | 122 | 427 | per-portion d=35 impossible |
| nx-2c37e33cd3 | Филе лосося на гриле | 140 | 173 | 242 | per-100g=173 fits salmon |
| nx-e77f79f305 | Брускетта лосось+сыр+авокадо | 210 | 152 | 319 | per-portion d=72 low for bruschetta |
| d14 | Брускетта ростбиф+песто | 160 | 232 | 371 | per-100g=232 fits bruschetta |
| nx-43c2969b98 | Сэндвич буженина+горчица | 290 | 233 | 676 | per-portion d=80 low for sandwich |
| d12 | Сэндвич с креветками | 230 | 167 | 384 | per-portion d=73 low for sandwich |
| d27 | Картофель фри | 140 | 285 | 399 | per-100g=285 perfect for fries |
| nx-dca54128e9 | Картофель фри или по-деревенски | 140 | 285 | 399 | same as d27 |
| nx-b84d399ec4 | Бородинские гренки с пармезаном | 150 | 206 | 309 | per-100g=206 fits parmesan toast |
| d34 | Жареные тигровые креветки | 190 | 111 | 211 | per-portion d=58 too low |
| d30 | Куриные стрипсы | 150 | 215 | 323 | per-100g=215 fits chicken strips |
| nx-c049fb926c | Селёдочка с картошечкой | 300 | 108 | 324 | per-portion d=36 too low |
| d6 | Куриные крылья BBQ | 260 | 194 | 504 | per-portion d=75 too low for wings |
| d35 | Куриные крылья сладкий чили | 260 | 225 | 585 | per-portion d=87 too low |
| d36 | Куриные крылья терияки | 260 | 209 | 543 | per-portion d=80 too low |
| d37 | Куриные крылья чипотл | 260 | 216 | 562 | per-portion d=83 too low |

---

## per_100g — MED confidence (6 rows)

Per-100g fits but per-portion is borderline-plausible.

| id | name | wt(g) | kcal | density | reasoning |
|---|---|---:|---:|---:|---|
| nx-3fb7eb3640 | Брауни с кешью и кремом | 160 | 497 | 311 (pport) | per-100g=497 right for dense brownie; per-portion d=311 also plausible |
| nx-8dc46b929a | Чизкейк Сан-Себастьян | 170 | 226 | 133 (pport) | per-100g=226 fits light cheesecake; per-portion d=133 too low |
| d28 | Картофель по-деревенски | 140 | 253 | 181 (pport) | per-100g=253 perfect for roasted; per-portion d=181 also possible |
| d32 | Картофельные шарики | 200 | 500 | 250 (pport) | per-100g=500 high but possible; per-portion d=250 also fits |
| d29 | Луковые кольца | 180 | 460 | 256 (pport) | per-100g=460 high for onion rings; per-portion d=256 fits |
| d31 | Сырные шарики | 180 | 520 | 289 (pport) | per-100g=520 high but possible; per-portion d=289 fits |

---

## Ambiguous (13 rows) — needs human call

Both interpretations land in the realistic range for the dish family. Original XLSX intent was "Ккал на 100г", so default guess is **per_100g** — but worth confirming.

| id | name | wt(g) | kcal | as per-100g portion | as per-portion density | suggested |
|---|---|---:|---:|---:|---:|---|
| nx-c24082245f | Баварский салат с беконом | 265 | 202 | 535 | 76 | per_100g |
| nx-ed87042546 | Греческий салат | 240 | 132 | 317 | 55 | per_100g |
| xu-1 | Салат свёкла + козий сыр | 230 | 213 | 490 | 93 | per_100g |
| nx-4caab83b88 | Салат свёкла + сиртаки | 230 | 205 | 472 | 89 | per_100g |
| nx-ece1e944c6 | Салат креветка авокадо черри | 160 | 128 | 205 | 80 | per_100g |
| nx-f4391df363 | Салатный микс с томатами | 140 | 115 | 161 | 82 | per_100g |
| nx-1cb3c67def | Цезарь с креветками | 175 | 241 | 422 | 138 | per_100g |
| nx-380013906c | Цезарь с курицей | 175 | 245 | 429 | 140 | per_100g |
| nx-341604cd4b | Цезарь с лососем | 175 | 253 | 443 | 145 | per_100g |

(For salads, per-portion ~80–145 kcal/100g is plausible for fresh leafy with dressing; per-100g 200–250 is plausible for dressed-protein bowls. Either way the displayed portion total would differ by ~3×.)

---

## How to apply decisions

Once each row has a basis, populate a new column on `menu.dishes`:

```sql
alter table menu.dishes add column kcal_basis text check (kcal_basis in ('per_100g','per_portion'));

-- bulk set per-portion rows (definite)
update menu.dishes set kcal_basis = 'per_portion'
where id in (
  'd8','d22','d25','d21','d20','d19','d17','d18','d15','d16',
  'd5','d33','nx-6b609ecd5d','nx-8a66beaf92','nx-835e13f5a0','nx-ad9f2c53b1',
  -- MED-confidence (review):
  'nx-85ccf8c2b1','d13','d26'
);

-- everything else with kcal stays default per_100g
update menu.dishes set kcal_basis = 'per_100g'
where kcal is not null and kcal_basis is null;
```

Then a basis-aware calc layer becomes trivial:

```sql
alter table menu.dishes
  add column kcal_per_portion integer generated always as (
    case when kcal_basis = 'per_portion' then kcal
         when kcal_basis = 'per_100g' and weight_g is not null
              then round(kcal * weight_g / 100.0)::int
    end
  ) stored;
-- same pattern for protein/fat/carbs
```

DishCard then renders `kcal_per_portion` and `protein_per_portion`/etc. — always per-portion, regardless of source.

---

## Open questions for the founder

1. **MED-confidence per_portion** (3 rows: `nx-85ccf8c2b1` Крем-суп шампиньонов, `d13` Брускетта лосось, `d26` Батат фри) — confirm per-portion?
2. **MED-confidence per_100g** (6 rows: brownies, cheesecake, roasted potatoes, potato/cheese/onion balls) — confirm per-100g?
3. **Ambiguous salads** (9 rows) — XLSX original column was "Ккал на 100г" but values look low-ish for dressed salads. Default guess per_100g — confirm or override?
4. **Steaks with null weight** (3 rows: Рибай, Стриплойн, Филе миньон) — values look like per_100g (steak densities). Should we add weights so the calc layer works for them too?

Once decisions land, I can convert this report into the actual UPDATE statements and apply via migration.
