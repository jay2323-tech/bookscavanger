"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadRun, saveRun, type RunStop } from "@/app/lib/bookRun";

function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function optimizeRoute(stops: RunStop[]): RunStop[] {
  if (stops.length <= 1) return stops;
  const remaining = [...stops];
  const ordered: RunStop[] = [remaining.shift()!];
  while (remaining.length) {
    const cur = ordered[ordered.length - 1];
    let bestI = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(cur, s);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    ordered.push(remaining.splice(bestI, 1)[0]);
  }
  return ordered;
}

export default function BookRunPage() {
  const [stops, setStops] = useState<RunStop[]>([]);

  useEffect(() => {
    setStops(loadRun());
  }, []);

  const optimized = useMemo(() => optimizeRoute(stops), [stops]);

  const totalKm = useMemo(() => {
    let t = 0;
    for (let i = 1; i < optimized.length; i++) {
      t += haversine(optimized[i - 1], optimized[i]);
    }
    return t;
  }, [optimized]);

  const remove = (id: string) => {
    const next = stops.filter((s) => s.id !== id);
    setStops(next);
    saveRun(next);
  };

  const clear = () => {
    setStops([]);
    saveRun([]);
  };

  const mapsUrl =
    optimized.length >= 1
      ? `https://www.google.com/maps/dir/${optimized
          .map((s) => `${s.latitude},${s.longitude}`)
          .join("/")}`
      : null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1
        className="text-3xl text-[#D4AF37] mb-2"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Book-run planner
      </h1>
      <p className="text-gray-400 mb-8">
        Add stops from search results, then open an optimized multi-stop route.
      </p>

      {stops.length === 0 ? (
        <p className="text-gray-500">
          No stops yet.{" "}
          <Link href="/search" className="text-[#D4AF37] hover:underline">
            Search books
          </Link>{" "}
          and click <b>Add to book run</b>.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {optimized.length} stops · ~{totalKm.toFixed(1)} km between libraries
            (straight-line)
          </p>
          <ol className="space-y-3 mb-8">
            {optimized.map((s, i) => (
              <li
                key={s.id}
                className="flex justify-between gap-4 bg-slate-900 border border-slate-800 rounded-lg p-4"
              >
                <div>
                  <p className="text-xs text-gray-500">Stop {i + 1}</p>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-gray-400">{s.library_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-sm text-red-400 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#D4AF37] text-black px-5 py-3 rounded-lg font-semibold"
              >
                Open in Google Maps
              </a>
            )}
            <button
              type="button"
              onClick={clear}
              className="border border-slate-600 px-5 py-3 rounded-lg"
            >
              Clear run
            </button>
            <Link
              href="/search"
              className="border border-slate-600 px-5 py-3 rounded-lg text-[#D4AF37]"
            >
              Add more books
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
