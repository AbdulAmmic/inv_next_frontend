import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// ELECTRON_BUILD=true -> static export (for Electron's file:// loading)
// Default (Vercel/web) -> normal Next.js server mode
const isElectronBuild = process.env.ELECTRON_BUILD === "true";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/dashboard/pos", // Instead of ~offline, just fall back to POS
  },
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
});

const nextConfig: NextConfig = {
  ...(isElectronBuild
    ? {
        output: "export",
        trailingSlash: true, // Electron needs /dashboard/index.html
      }
    : {}),

  images: {
    unoptimized: true, // Required for static export; fine for Vercel too
  },

  // Silence the multiple lockfiles workspace root warning
  outputFileTracingRoot: process.cwd(),
};

export default isElectronBuild ? nextConfig : withPWA(nextConfig);
