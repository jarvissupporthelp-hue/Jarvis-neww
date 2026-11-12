import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/career/pdf": ["./node_modules/@fontsource/noto-sans/files/*-400-normal.woff", "./node_modules/@fontsource/noto-sans-armenian/files/*-400-normal.woff"],
  },
  serverExternalPackages: ["unpdf"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/math-lab/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
    ];
  },
};

export default nextConfig;
