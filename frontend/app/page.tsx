"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <main className="relative overflow-hidden">
      {/* Atmospheric background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(212,175,55,0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 10%, rgba(56,189,248,0.08), transparent 50%), linear-gradient(180deg, #0B1224 0%, #0F172A 45%, #0B1224 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* HERO — brand first, one job */}
      <section className="relative min-h-[calc(100vh-73px)] flex items-center px-6 md:px-10">
        <div
          className={`max-w-3xl transition-all duration-1000 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p
            className="text-[#D4AF37] text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Lectère
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl text-[#F8F5F0] font-medium leading-snug mb-4 max-w-xl">
            Physical books, found like online search.
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-lg">
            Search by title, author, or ISBN — Lectère shows the nearest
            libraries that have the book on the shelf.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/search"
              className="inline-flex items-center justify-center bg-[#D4AF37] text-black px-7 py-3.5 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Find a book
            </Link>
            <Link
              href="/for-libraries"
              className="inline-flex items-center justify-center border border-gray-600 text-gray-200 px-7 py-3.5 rounded-lg font-medium hover:border-[#D4AF37] hover:text-[#D4AF37] transition"
            >
              List your library
            </Link>
          </div>
        </div>

        {/* Visual plane — shelf / atmosphere, not a card */}
        <div
          aria-hidden
          className={`hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[42vw] max-w-xl h-[70vh] transition-all duration-1200 delay-200 ease-out ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
          }`}
          style={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(15,23,42,0.2) 40%, rgba(30,58,95,0.5) 100%), repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(212,175,55,0.08) 48px, rgba(212,175,55,0.08) 50px)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 18%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 18%, black 100%)",
          }}
        />
      </section>

      {/* How it works — one job */}
      <section className="relative border-t border-gray-800 px-6 md:px-10 py-24">
        <div className="max-w-3xl">
          <h2
            className="text-3xl md:text-4xl text-[#D4AF37] mb-4"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            How it works
          </h2>
          <p className="text-gray-400 mb-12 max-w-xl">
            Three steps between you and a book on a real shelf nearby.
          </p>
          <ol className="space-y-10">
            {[
              {
                n: "01",
                t: "Search",
                d: "Enter a title, author, or ISBN. We use your location to rank results.",
              },
              {
                n: "02",
                t: "See nearby libraries",
                d: "Matches appear sorted by distance, with availability from each library.",
              },
              {
                n: "03",
                t: "Go get the book",
                d: "Open the map, pick a library, and head over — no endless online browsing.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-6 items-start">
                <span
                  className="text-[#D4AF37]/40 text-2xl font-semibold tabular-nums"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  {step.n}
                </span>
                <div>
                  <h3 className="text-xl font-semibold mb-1">{step.t}</h3>
                  <p className="text-gray-400 max-w-md">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA strip */}
      <section className="relative border-t border-gray-800 px-6 md:px-10 py-20">
        <div className="max-w-3xl">
          <h2
            className="text-3xl text-[#F8F5F0] mb-4"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Ready to look?
          </h2>
          <p className="text-gray-400 mb-8">
            Start with a search — or bring your library onto Lectère.
          </p>
          <Link
            href="/search"
            className="inline-flex bg-[#D4AF37] text-black px-7 py-3.5 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Go to search
          </Link>
        </div>
      </section>
    </main>
  );
}
