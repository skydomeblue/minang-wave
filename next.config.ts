import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,

  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(mp3|aac|stream)/,
      handler: "NetworkOnly",
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // penting untuk Next.js 16
  turbopack: {},
};

export default withPWA(nextConfig);
