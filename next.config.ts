import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do NOT set output: "standalone" on Vercel — Vercel's Next.js preset handles output itself.
  // Setting it causes: ENOENT .next/next-server.js.nft.json
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.vercel.app"],
};

export default nextConfig;
