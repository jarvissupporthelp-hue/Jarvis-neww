import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/career/pdf": ["./node_modules/@fontsource/noto-sans/files/*-400-normal.woff", "./node_modules/@fontsource/noto-sans-armenian/files/*-400-normal.woff"],
  },
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
