import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All pages use client-side rendering with React hooks (useState, useEffect, etc.)
  // Force dynamic rendering to avoid SSR prerendering errors with radix-ui and React hooks
  serverExternalPackages: ["radix-ui"],
};

export default nextConfig;
