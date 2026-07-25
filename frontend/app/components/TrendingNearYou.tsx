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
    const load = () => {
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
    };

    load();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 mt-8">Loading trending near you…</p>
    );
  }

  if (!items.length) return null;

  return (
    <section className="mt-10 mb-2">
      <h2
        className="text-xl text-[#D4AF37] mb-3"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Trending near you
      </h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <li key={item.title}>
            <Link
              href={`/search?q=${encodeURIComponent(item.title)}`}
              className="block rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 hover:border-[#D4AF37] transition"
            >
              <p className="font-medium text-[#F8F5F0]">{item.title}</p>
              <p className="text-sm text-slate-400 mt-1">
                {item.author || "Unknown author"}
                {item.distance != null
                  ? ` · ${item.distance.toFixed(1)} km`
                  : ""}
                {item.search_count > 0
                  ? ` · ${item.search_count} recent searches`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
