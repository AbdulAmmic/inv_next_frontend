import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tuhanas Inventory",
  description: "Offline-first multi-shop inventory management for Tuhanas Kitchen & Scents.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png",           type: "image/png", sizes: "any"     },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple:    "/icons/icon-192x192.png",
    shortcut: "/favicon.png",
  },
  appleWebApp: { capable: true, title: "Tuhanas Inventory", statusBarStyle: "default" },
  other: { "theme-color": "#d4940a", "mobile-web-app-capable": "yes" },
};


import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#d4940a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />

      </head>
      <body
        className="antialiased text-black"
      >
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
