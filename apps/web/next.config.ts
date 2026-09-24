import type { NextConfig } from 'next'

const config: NextConfig = {
  // Static export: the whole app is plain files on a CDN. No server, no cost.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  // Relative asset paths let the static build run from any sub-path (e.g. a hosted preview).
  ...(process.env.RELATIVE_ASSETS ? { assetPrefix: './' } : {}),
  transpilePackages: ['@unbox-box/tools', '@unbox-box/webmcp'],
}

export default config
