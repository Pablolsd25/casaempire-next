import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.openpay.mx https://openpay.s3.amazonaws.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "media-src 'self' blob: https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' blob: https://*.supabase.co https://api.openpay.mx https://sandbox-api.openpay.mx",
              "worker-src 'self' blob:",
              "frame-src https://js.openpay.mx https://sandbox-api.openpay.mx https://api.openpay.mx",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        // Supabase Storage — imágenes de productos y blog
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Supabase Image Transformations — resize on CDN
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/render/image/public/**',
      },
    ],
  },
};

export default nextConfig;
