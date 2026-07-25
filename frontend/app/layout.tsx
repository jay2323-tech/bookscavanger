import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import Navbar from "@/app/components/Navbar";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} bg-[#0F172A] text-[#F8F5F0] min-h-screen antialiased`}
        style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
