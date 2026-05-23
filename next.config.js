/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sfzyqdpckgyznuhunygj.supabase.co' },
      { protocol: 'https', hostname: 'eda.yandex' },
    ],
  },
}
module.exports = nextConfig
