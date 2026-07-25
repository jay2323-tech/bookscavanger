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
    <main className="relative overflow-hidden bg-bs-paper">
      {/* Full-bleed hero visual plane */}
      <section className="relative min-h-[calc(100vh-4.5rem)] flex items-end md:items-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(105deg, rgba(242,244,247,0.97) 0%, rgba(242,244,247,0.88) 38%, rgba(242,244,247,0.25) 62%, transparent 78%),
              repeating-linear-gradient(90deg, #0f766e 0px, #0f766e 10px, #142033 10px, #142033 14px, #c9a227 14px, #c9a227 18px, #5b6577 18px, #5b6577 22px, transparent 22px, transparent 36px),
              linear-gradient(180deg, #e8eef2 0%, #d5dbe5 100%)
            `,
            backgroundSize: "auto, 180px 100%, auto",
            backgroundPosition: "0 0, right center, 0 0",
            backgroundRepeat: "no-repeat, repeat-x, no-repeat",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-40 bs-paper-grid"
        />

        <div
          className={`relative z-10 px-6 md:px-10 pb-16 md:pb-0 md:py-24 max-w-2xl transition-all duration-1000 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p
            className="text-bs-ink text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight mb-5"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Book<span className="text-bs-gold">Scavenger</span>
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl text-bs-ink font-medium leading-snug mb-3 max-w-lg">
            Physical books, found like online search.
          </h1>
          <p className="text-bs-muted text-base sm:text-lg mb-8 max-w-md">
            Search a title — see the nearest library that has it on the shelf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/search"
              className="inline-flex items-center justify-center bg-bs-gold text-bs-gold-ink px-7 py-3.5 rounded-lg font-semibold hover:brightness-95 transition"
            >
              Find a book
            </Link>
            <Link
              href="/for-libraries"
              className="inline-flex items-center justify-center border border-bs-line bg-bs-surface text-bs-ink px-7 py-3.5 rounded-lg font-medium hover:border-bs-teal hover:text-bs-teal transition"
            >
              For libraries
            </Link>
          </div>
        </div>
      </section>

      <section className="relative border-t border-bs-line px-6 md:px-10 py-20 md:py-24 bg-bs-surface">
        <div className="max-w-3xl">
          <h2
            className="text-3xl md:text-4xl text-bs-ink mb-3"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            How it works
          </h2>
          <p className="text-bs-muted mb-12 max-w-xl">
            Three steps between you and a book on a real shelf.
          </p>
          <ol className="space-y-10">
            {[
              {
                n: "01",
                t: "Search or scan",
                d: "Title, author, or ISBN — use the camera for barcodes.",
              },
              {
                n: "02",
                t: "See nearby copies",
                d: "Editions across libraries, ranked by distance and stock.",
              },
              {
                n: "03",
                t: "Get directions",
                d: "Open Maps, plan a book run, or request a hold.",
              },
            ].map((step, i) => (
              <li
                key={step.n}
                className="flex gap-6 items-start bs-fade-in"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span
                  className="text-bs-teal/50 text-2xl font-semibold tabular-nums"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  {step.n}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-bs-ink mb-1">
                    {step.t}
                  </h3>
                  <p className="text-bs-muted max-w-md">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative border-t border-bs-line px-6 md:px-10 py-16 bg-bs-paper">
        <div className="max-w-3xl">
          <h2
            className="text-3xl text-bs-ink mb-3"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Ready to look?
          </h2>
          <p className="text-bs-muted mb-8">
            Start with a search — or list your library on BookScavenger.
          </p>
          <Link
            href="/search"
            className="inline-flex bg-bs-gold text-bs-gold-ink px-7 py-3.5 rounded-lg font-semibold hover:brightness-95 transition"
          >
            Go to search
          </Link>
        </div>
      </section>
    </main>
  );
}
