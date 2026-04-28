import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: { typedRoutes: true },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000',
  },
};

export default config;