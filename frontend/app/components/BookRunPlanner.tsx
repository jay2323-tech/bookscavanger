"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadRun, saveRun, type RunStop } from "@/app/lib/bookRun";
import Button from "@/app/components/ui/Button";

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

export default function BookRunPlanner({
  findHref = "/search",
}: {
  findHref?: string;
}) {
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
    <div className="bs-fade-in max-w-xl">
      <h1
        className="text-3xl text-bs-ink mb-2"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Book-run planner
      </h1>
      <p className="text-bs-muted mb-8">
        Add stops from search, then open an optimized multi-stop route.
      </p>

      {stops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bs-line bg-bs-surface/60 p-8 text-center">
          <p className="text-bs-muted mb-4">
            No stops yet. Search for a book and use{" "}
            <span className="text-bs-ink font-medium">
              More → Add to book run
            </span>
            .
          </p>
          <Link
            href={findHref}
            className="inline-flex rounded-lg bg-bs-gold text-bs-gold-ink px-5 py-2.5 text-sm font-semibold"
          >
            Find a book
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-bs-teal mb-4 font-medium">
            {optimized.length} stops · ~{totalKm.toFixed(1)} km between
            libraries
          </p>
          <ol className="space-y-0 mb-8 border-l-2 border-bs-teal/40 ml-3">
            {optimized.map((s, i) => (
              <li key={s.id} className="relative pl-6 pb-6 last:pb-0">
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-bs-teal border-2 border-bs-paper" />
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-xs text-bs-muted">Stop {i + 1}</p>
                    <p className="font-semibold text-bs-ink">{s.title}</p>
                    <p className="text-sm text-bs-muted">{s.library_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="text-sm text-bs-danger hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg bg-bs-gold text-bs-gold-ink px-5 py-3 text-sm font-semibold"
              >
                Open in Google Maps
              </a>
            )}
            <Button type="button" variant="secondary" onClick={clear}>
              Clear run
            </Button>
            <Link
              href={findHref}
              className="inline-flex items-center rounded-lg border border-bs-line px-5 py-3 text-sm text-bs-teal"
            >
              Add more books
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
