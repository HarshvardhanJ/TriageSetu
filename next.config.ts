import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker / Vercel optimization
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the dev preview origin to access _next resources without warnings
  allowedDevOrigins: ["*.space-z.ai", "*.vercel.app"],
};

export default nextConfig;
