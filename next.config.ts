import type { NextConfig } from "next";

function contentSecurityPolicy(frameAncestors: "'none'" | "'self'") {
  return {
    key: "Content-Security-Policy",
    value: `base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors ${frameAncestors}`,
  };
}

const securityHeaders = [
  contentSecurityPolicy("'none'"),
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
      { source: "/math-lab/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }, contentSecurityPolicy("'self'")] },
    ];
  },
};

export default nextConfig;
