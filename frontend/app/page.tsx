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
      {/* Full-bleed hero — soft sky wash + shelf silhouette plane */}
      <section className="relative min-h-[calc(100vh-4.5rem)] flex items-end md:items-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(105deg, #eef1f5 0%, #eef1f5 42%, rgba(238,241,245,0.55) 68%, rgba(238,241,245,0.15) 100%),
              linear-gradient(180deg, #dcecea 0%, #e8ecef 45%, #e6dfd0 100%)
            `,
          }}
        />
        {/* Soft book-spine plane on the right (desktop) */}
        <div
          aria-hidden
          className={`hidden lg:block absolute inset-y-0 right-0 w-[48%] transition-all duration-1000 delay-150 ease-out ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
          }`}
          style={{
            background: `
              radial-gradient(ellipse 80% 70% at 70% 40%, rgba(15,118,110,0.22), transparent 70%),
              radial-gradient(ellipse 50% 45% at 85% 70%, rgba(201,162,39,0.22), transparent 65%),
              linear-gradient(160deg, #c9ddd9 0%, #d5dde6 40%, #d0c6b0 100%)
            `,
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 22%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 22%, black 100%)",
          }}
        />
        {/* Quiet horizontal shelf lines */}
        <div
          aria-hidden
          className="hidden lg:block absolute inset-y-[18%] right-0 w-[42%] opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent 0, transparent 52px, rgba(20,32,51,0.12) 52px, rgba(20,32,51,0.12) 53px)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 30%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 30%, black 100%)",
          }}
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
              className="inline-flex items-center justify-center border border-bs-line bg-bs-surface/90 text-bs-ink px-7 py-3.5 rounded-lg font-medium hover:border-bs-teal hover:text-bs-teal transition"
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

      <section className="relative border-t border-bs-line px-6 md:px-10 py-16 bs-field">
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
