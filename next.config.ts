import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // trailingSlash: true → /dashboard/products → /dashboard/products/index.html
  // Required so Electron's loadFile() can find pages without a server
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
