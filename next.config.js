/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sfzyqdpckgyznuhunygj.supabase.co' },
      // eda.yandex kept until existing dish photos are re-hosted to Supabase Storage —
      // tracked via menu.dq_dashboard.photo_is_supabase.
      { protocol: 'https', hostname: 'eda.yandex' },
    ],
  },
}
module.exports = nextConfig
