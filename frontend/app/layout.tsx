import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import AuthHashCatcher from "@/app/components/AuthHashCatcher";
import Navbar from "@/app/components/Navbar";
import PwaRegister from "@/app/components/PwaRegister";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "BookScavenger — Find books near you",
  description:
    "Search for books and discover the nearest libraries that have them in stock.",
  applicationName: "BookScavenger",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BookScavenger",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#C9A227",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${display.variable} ${body.variable} bg-bs-paper text-bs-ink min-h-screen antialiased`}
        style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
      >
        <AuthHashCatcher />
        <PwaRegister />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
