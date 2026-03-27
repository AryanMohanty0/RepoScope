import type { NextConfig } from "next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your other config ...
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};
export default nextConfig;