import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: 'standalone',
  experimental: {
    cpus: 1,
  },
  poweredByHeader: false,
  allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
