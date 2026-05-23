# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build (port 3000; this is what the Amvera deploy uses)

There are no test, lint, or typecheck scripts configured. Type errors surface only via `next build` (TS `strict: true`).

## Required environment

`src/lib/supabase/server.ts` throws at import time if these are not set, so any page that imports it (currently `/menu`) will fail to build/render without them:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional: `NEXT_PUBLIC_BASE_PATH` is prepended to static asset URLs on the landing page (e.g. wordmark image).

The Supabase client is configured with `db: { schema: 'menu' }` — all queries hit the `menu` Postgres schema, not `public`.

## Architecture

Next.js 14 App Router project (single app, no monorepo). Two distinct surfaces:

1. **Landing page** (`src/app/page.tsx`) — static marketing page for the "МОСТ" restobar. Pure presentational components (`src/components/Background.tsx`, `ContactCard.tsx`); no data fetching.

2. **Menu** (`src/app/menu/`) — server-rendered menu with ISR (`revalidate = 300`) and `robots: noindex`. This is where the architectural complexity lives.

### Menu data flow

`src/app/menu/page.tsx` is a server component that runs three parallel Supabase queries (`categories`, `dishes` where `available=true`, `dish_extras`) and pipes the rows through `hydrateDishes` (`src/lib/menu/group.ts`), which joins extras onto their parent dish and partitions them by `kind`:

- `addon` → flat list of paid add-ons
- `mod` → flat list of modifiers
- `option` → grouped into a single `OptionGroup` (one per dish), using `group_label` / `is_required` / `is_default` from the rows

The hydrated `Dish[]` (shape in `src/lib/menu/types.ts`) is handed to the client component `MenuApp` (`src/app/menu/_components/MenuApp.tsx`), which owns all interactivity (category pills, featured strip, dish detail sheet, shortlist/favorites).

**Fixture fallback:** if the Supabase query returns zero dishes, the page renders `fixtureCategories` / `fixtureDishes` from `src/menu/fixture.ts` instead. Treat this as the canonical example of the `Dish` shape when reasoning about the UI without a DB.

**User-facing strings** live in `src/menu/copy.ts` (Russian). Prefer editing copy there rather than in components.

### Types boundary

`DishRow` / `DishExtraRow` in `src/lib/menu/types.ts` mirror the Supabase table columns (snake_case, nullable). `Dish` is the hydrated, UI-friendly shape (camelCase, defaulted strings, grouped extras). `hydrateDishes` is the only place that bridges them — keep new DB columns flowing through that function.

### Path alias

`@/*` → `./src/*` (see `tsconfig.json`).

## Deployment

`amvera.yml` deploys via Amvera on `node:20-alpine`: `npm ci && npm run build` then `npm run start` on port 3000. `CNAME` indicates a custom domain is served by GitHub Pages for something, but the Next app itself is the Amvera-hosted target.
