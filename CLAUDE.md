# MOST — agent notes

Restobar menu MVP. Next 14 (app router) + Supabase + Amvera deploy. Russian-language UI.
Founder ships fast on real data; **brand-facing polish matters more than abstractions**.

## ⛔ Hard rule — UI/styles verification before any commit

If your diff touches **any** of the following, you MUST re-screenshot the affected page at
**desktop (1280px) AND mobile (390px)** with a headless browser before committing,
and visually compare to the prior screenshot:

- Any file under `src/app/menu/` or `src/app/menudq/`
- `src/app/globals.css`, `src/app/menu/menu.css`, `src/app/menudq/menudq.css`
- Any component under `src/app/menu/_components/` (esp. `brand/`)
- `tailwind.config.ts`, `postcss.config.js`, `next.config.js`
- Anything touching `<Wordmark>`, `<TopBar>`, `<CategoryPills>`, `<DishCard>`, `<DishMedia>`,
  `<FeaturedStrip>`, `<ShortlistSheet>`, the favorites/shortlist UI, or sticky-header layout

Quick recipe (dev server already running on :3000):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --disable-gpu \
  --screenshot=tmp/screenshots/menu-desktop.png --window-size=1280,1600 \
  --virtual-time-budget=5000 http://localhost:3000/menu 2>/dev/null
```

**Mobile: don't use headless `--window-size=390`.** Headless Chrome lays the page out wider
(~500px) and crops it, which fakes a horizontal-overflow bug (2nd grid column and the
«ИЗБРАННОЕ» heart look cut off). Use the in-app browser pane instead: `resize_window`
preset `mobile` (375×812), navigate to `/menu`, screenshot; reset to `desktop` after.
Sanity check: `document.documentElement.scrollWidth` should equal 375.

Then `Read` both PNGs — do NOT trust that the diff "looks right in the editor".
If a font size, padding, margin, asset ratio, or alignment shifted, **call it out before
suggesting the commit**.

Specifically watch for:
- Wordmark dimensions and the red arch's vertical alignment in the logo
- TopBar horizontal balance (logo left, favorites right, neither cropped)
- Sticky header height matching `scroll-margin-top` on sections (`.mb-cat-section`);
  the same height feeds the scroll-spy threshold in `MenuApp.tsx` (`headerH`)
- DishCard photo aspect ratio and the brand placeholder when `photo_url` is null
- Pills active-state (outlined: transparent fill, `--border-2` ring, white text) — NOT a
  loud red fill; the same look applies on click AND on scroll-spy highlight

`MenuApp.tsx` sets `isDesktop` via a client `useEffect`, so SSR/headless always renders the
mobile tree first. Both viewports now use the **same top category strip** (`<CategoryPills>`);
there is no longer a desktop sidebar. Test desktop interactions in a real browser at ≥900px.

## /menu layout (current)

- **Single top strip on both viewports.** `MenuApp.tsx` renders `<TopBar>` (wordmark left,
  heart+«ИЗБРАННОЕ» right) and `<CategoryPills>` (horizontal category strip) inside `.mb-stick`.
  The old `DesktopSidebar` is **removed** — don't reintroduce a sidebar. Desktop is a single
  centered column (`.menu-app.is-desktop { display: block }`, `.mb-content` max-width 1200px).
- **FeaturedStrip** has no section header (the «— 01 СЕЙЧАС В ФОКУСЕ» eyebrow/title were dropped);
  category numbering starts at 01 on the first real category.
- **Favorites heart** (`HeartCounter`) shows the live count inside the heart; card hearts
  **toggle** (tap to add, tap again to remove via `toggleQuick` in `MenuApp.tsx`).
- **ShortlistSheet** (`BottomSheet` variant `sheet`) opens from the `HeartCounter` button. It
  shows the guest's favorited dishes with quantity controls and a total, under the eyebrow
  «— избранное к столу». The CTA instructs showing the list to a waiter — this is NOT online
  ordering. Swipe-down-to-dismiss on mobile.
- **Detail sheet** (`BottomSheet` variant `sheet`) is swipe-down-to-dismiss on mobile; the hero
  sets an inline `background-image` (`/_next/image…&w=640`) so the photo doesn't flash on open.
- **Per-100g pricing:** dishes with `price_per_100g = true` (steaks, pork ribs, ossobuco) render
  a quiet `/100 г` suffix next to the price in `DishCard` and detail. Copy key: `copy.card.per100`.
- **Opening hours** live in `copy.footer.hours = { weekday, weekend }`, rendered as two lines in
  `MenuFooter` (shown on desktop too — footer is no longer hidden at ≥900px).
- **Favicon** = the МОСТ arch, wired via `metadata.icons` → `/assets/most_mark.png` in
  `src/app/layout.tsx`.

## /menudq — internal kitchen data-quality tool

Internal route (`robots: noindex`). Shows the data-quality checklist for all dishes.

- **Gap export** (`ExportGaps.tsx`): generates a copy-paste text list + downloadable CSV of
  dishes missing real data (name / short / desc / price / ingredients / kcal+БЖУ / photo).
  Used by the team to brief Masha (content person) on what needs filling in.
- **DQ checklist columns** (from `menu.dq_checklist` view): `name_state`, `short_state`,
  `description_state`, `price_state`, `ingredients_state`, `nutrition_state`, `photo_state`
  (each: `'real' | 'mock' | 'missing'`), plus `is_verified`, `verified_by_masha`,
  `masha_state` (`'not_ready' | 'pending' | 'done'`), `completeness` (0–1 float).
- No auth on this route currently — it's obscure-URL access only.

## Categories (canonical 8, paper-menu order)

After migration 0004, the DB has exactly these categories (slug → display name):

| slug | name | sort_order |
|------|------|-----------|
| `snacks` | Закуски | 10 |
| `salads` | Салаты | 20 |
| `soups` | Супы | 30 |
| `burgers` | Бургеры | 40 |
| `sandwiches` | Сэндвичи и брускетты | 50 |
| `mains` | Еда | 60 |
| `grill` | Мангал | 70 |
| `desserts` | Десерты | 80 |

Напитки are served separately and not in the DB yet.
Крылья → `snacks`. Паста → `mains`. Рёбра → `grill`. Картофель фри → `snacks`. No Гарниры, no Рис.

## Push / build safety

- **Pre-push hook:** `.githooks/pre-push` runs `rm -rf .next && npm run build` and blocks the
  push if the build fails (catches breakage before Amvera). Enabled via `core.hooksPath`,
  auto-set by the `prepare` npm script on `npm install`. Emergency bypass: `git push --no-verify`.
- **Deploy pipeline:** push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) pushes
  `HEAD:master` on `git.msk1.amvera.ru/miordanus/most` (region Moscow-1; Amvera builds
  **master**, not main — msk0 is retired) → Amvera runs `npm run build && npm start`. Credentials stored as
  `AMVERA_USERNAME` / `AMVERA_PASSWORD` repository secrets. No manual `git push amvera` needed.
- Amvera deploys with a clean `npm run build` (`amvera.yml`), so the prod build never sees a
  stale `.next`. That staleness is a **local dev** problem only (see below).

## Project-specific gotchas

- **Fonts:** loaded via browser `<link>` in `src/app/menu/layout.tsx`, NOT `next/font/google` —
  Amvera build env can't reach Google. Don't switch back to `next/font`.
- **Brand assets:** `/public/assets/wordmark.png` (full МОСТ), `/public/assets/most_mark.png`
  (just the arch, used as photo-missing placeholder via `ArchPlaceholder` / `ArchMark`).
- **Supabase schema:** `menu.dishes`, `menu.categories`, `menu.dish_extras`, `menu.dq_checklist`
  (view), `menu.dq_summary` (view), `menu.import_runs`. Source columns accept only
  `menu_photo | xlsx | fixture | manual | mockup | unknown` (CHECK constraint
  `dishes_source_values_chk`). Don't try `'real'` — view treats anything ≠ `'mockup'` as real.
- **`price_per_100g` column:** `boolean NOT NULL DEFAULT false` on `menu.dishes`. Set to `true`
  on steaks (6), pork ribs (3), ossobuco (1). `DishRow.price_per_100g` → `Dish.pricePer100g`.
- **Mock marker UX:** when `*_source = 'mockup'` on a dish field, public `/menu` rendering
  should mark it (planned `~` prefix). Empty addons must NOT render a fallback like
  "уточняйте у официанта" — section is hidden when `dish.addons.length === 0` (see
  `DishDetailSheet.tsx`).
- **Dev server:** Next 14 `.next/` cache occasionally goes stale — symptom is a 500 on
  `/_next/static/css/...` or `Cannot find module './XXX.js'` (styles look "broken" in the
  browser even though the source is fine). Fix: kill the dev process, `rm -rf .next`, restart
  (`npm run dev:clean` does this). Don't just retry — the cache will keep failing.
- **DB writes:** `menu.import_runs` table is the audit log — any bulk DB change should
  insert one row describing what ran and why.

## Working with the founder

- Match their pace: terse, action-first replies. No "summary of what we just did" trailing
  paragraphs unless asked.
- Cite `file_path:line_number` for any code reference so they can jump to it.
- When making DB writes, show the SQL and pause for explicit go-ahead before executing.
- UI feedback workflow: founder pastes a screenshot (sometimes annotated in Preview);
  agent locates the component, proposes the fix, edits, **re-screenshots both viewports**
  per the hard rule above.

## What NOT to do

- Don't refactor or restyle adjacent elements when the ask is a cosmetic fix.
- Don't add design-system abstractions for one-off polish.
- Don't change `globals.css` reset rules without a stated reason (`html, body { height:100% }`
  was load-bearing for sticky-header math earlier — verify scroll still works if you touch it).
- Don't silently swap an asset, font, or sizing primitive — call it out in the response.
- Don't commit without your own re-screenshot pass.
