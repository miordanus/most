/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: '/most',
  assetPrefix: '/most',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/most',
  },
}
module.exports = nextConfig
