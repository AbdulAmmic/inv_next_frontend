import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tuhanas Inventory",
  description: "Offline-first multi-shop inventory management for Tuhanas Kitchen & Scents.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo_tuhanas.png", type: "image/png" },
    ],
    apple: "/logo_tuhanas.png",
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
        <link rel="apple-touch-icon" href="/logo.png" />
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
