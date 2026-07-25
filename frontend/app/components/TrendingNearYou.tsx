"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Trend = {
  title: string;
  author: string | null;
  library_name: string | null;
  distance: number | null;
  search_count: number;
};

export default function TrendingNearYou() {
  const [items, setItems] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async (lat?: number, lng?: number) => {
      try {
        const url = new URL(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/trending`
        );
        if (lat != null && lng != null) {
          url.searchParams.set("lat", String(lat));
          url.searchParams.set("lng", String(lng));
        }
        url.searchParams.set("limit", "6");
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      run();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => run(pos.coords.latitude, pos.coords.longitude),
      () => run()
    );
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-bs-muted mt-6">Loading trending near you…</p>
    );
  }

  if (!items.length) return null;

  return (
    <section className="mt-6 mb-6">
      <h2
        className="text-lg text-bs-ink mb-3"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Trending near you
      </h2>
      <ul className="grid sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <li key={item.title}>
            <Link
              href={`/search?q=${encodeURIComponent(item.title)}`}
              className="block rounded-lg border border-bs-line bg-bs-surface px-4 py-3 hover:border-bs-teal transition"
            >
              <p className="font-medium text-bs-ink">{item.title}</p>
              <p className="text-sm text-bs-muted mt-1">
                {item.author || "Unknown author"}
                {item.distance != null
                  ? ` · ${item.distance.toFixed(1)} km`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
