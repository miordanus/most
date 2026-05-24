# most

## Dish photos

To add or replace dish photos:

1. Drop originals into any folder, e.g. `~/Desktop/most-photos/`.
2. Stage them (converts to WebP, writes `tmp/photos-staged/_manifest.json`):
   ```bash
   node scripts/menu/photos_stage.mjs ~/Desktop/most-photos
   ```
3. Set the admin envs in `.env.local` (never commit, never set on Amvera):
   ```
   PHOTO_ADMIN_TOKEN=<random-string>
   SUPABASE_SERVICE_ROLE_KEY=<from supabase dashboard>
   ```
4. Run `npm run dev`, open `http://localhost:3000/admin/photo-match?t=<token>`.
5. Click through: pick the matching dish for each photo, hit Enter. Each match uploads to Supabase Storage (`dishes` bucket) and updates `menu.dishes.photo_url`.

Without `PHOTO_ADMIN_TOKEN` the admin route returns 404, so it's safe in production.
