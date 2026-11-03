/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sfzyqdpckgyznuhunygj.supabase.co' },
    ],
  },
}
module.exports = nextConfig
