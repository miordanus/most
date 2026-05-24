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
- Anything touching `<Wordmark>`, `<TopBar>`, `<DesktopSidebar>`, `<DishCard>`, `<DishMedia>`,
  the hero, the favorites/shortlist UI, or sticky-header layout

Quick recipe (dev server already running on :3000):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --disable-gpu \
  --screenshot=tmp/screenshots/menu-desktop.png --window-size=1280,1600 \
  --virtual-time-budget=5000 http://localhost:3000/menu 2>/dev/null
"$CHROME" --headless=new --hide-scrollbars --disable-gpu \
  --screenshot=tmp/screenshots/menu-mobile.png --window-size=390,1800 \
  --virtual-time-budget=5000 http://localhost:3000/menu 2>/dev/null
```

Then `Read` both PNGs — do NOT trust that the diff "looks right in the editor".
If a font size, padding, margin, asset ratio, or alignment shifted, **call it out before
suggesting the commit**.

Specifically watch for:
- Wordmark dimensions and the red arch's vertical alignment in the logo
- TopBar horizontal balance (logo left, favorites right, neither cropped)
- Sticky header height matching `scroll-margin-top` on sections (`.mb-cat-section`)
- DishCard photo aspect ratio and the brand placeholder when `photo_url` is null
- Pills/sidebar active-state colors and the category number gutter

If headless screenshots show mobile pills instead of the desktop sidebar, that's expected
in SSR — `MenuApp.tsx` sets `isDesktop` via a client `useEffect`. Test desktop interactions
in a real browser at desktop width.

## Project-specific gotchas

- **Fonts:** loaded via browser `<link>` in `src/app/menu/layout.tsx`, NOT `next/font/google` —
  Amvera build env can't reach Google. Don't switch back to `next/font`.
- **Brand assets:** `/public/assets/wordmark.png` (full МОСТ), `/public/assets/most_mark.png`
  (just the arch, used as photo-missing placeholder via `ArchPlaceholder` / `ArchMark`).
- **Supabase schema:** `menu.dishes`, `menu.categories`, `menu.dish_extras`, `menu.dq_checklist`
  (view), `menu.dq_summary` (view), `menu.import_runs`. Source columns accept only
  `menu_photo | xlsx | fixture | manual | mockup | unknown` (CHECK constraint
  `dishes_source_values_chk`). Don't try `'real'` — view treats anything ≠ `'mockup'` as real.
- **Mock marker UX:** when `*_source = 'mockup'` on a dish field, public `/menu` rendering
  should mark it (planned `~` prefix). Empty addons must NOT render a fallback like
  "уточняйте у официанта" — section is hidden when `dish.addons.length === 0` (see
  `DishDetailSheet.tsx`).
- **Dev server:** Next 14 `.next/` cache occasionally goes stale (`Cannot find module './XXX.js'`).
  Fix: kill the dev process, `rm -rf .next`, restart `npm run dev`. Don't just retry —
  the cache will keep failing.
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
