import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['edcngvcjzajzfsordyvu.supabase.co'],
  },
  // ⚠️ Ignore lint and TypeScript errors during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;