import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Disable SW in development to avoid caching issues
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  // Required for Serwist to inject the precache manifest
  reactStrictMode: true,
}

export default withSerwist(nextConfig)
