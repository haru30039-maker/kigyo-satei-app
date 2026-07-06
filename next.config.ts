import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  },
};

export default nextConfig;
