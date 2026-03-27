import type { NextConfig } from "next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !! Dangerously allow production builds even if there are type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to complete even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;