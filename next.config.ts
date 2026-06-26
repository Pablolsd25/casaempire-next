import type { NextConfig } from "next";
import path from "path";

const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
let r2Hostname: string | undefined
try {
  if (r2PublicUrl) r2Hostname = new URL(r2PublicUrl).hostname
} catch {
  r2Hostname = undefined
}

const imgSrc = ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.r2.dev"]
const mediaSrc = ["'self'", "blob:", "https://*.supabase.co", "https://*.r2.dev"]
const imagePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
  {
    protocol: "https",
    hostname: "*.r2.dev",
    pathname: "/**",
  },
]

if (r2Hostname && !r2Hostname.endsWith('.r2.dev')) {
  imgSrc.push(`https://${r2Hostname}`)
  mediaSrc.push(`https://${r2Hostname}`)
  imagePatterns.push({
    protocol: "https",
    hostname: r2Hostname,
    pathname: "/**",
  })
}

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
              `img-src ${imgSrc.join(" ")}`,
              `media-src ${mediaSrc.join(" ")}`,
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
    remotePatterns: imagePatterns,
  },
};

export default nextConfig;
