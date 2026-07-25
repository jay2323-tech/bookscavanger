"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import EditionResultCard, {
  type Edition,
} from "../components/EditionResultCard";
import EmptyState from "../components/EmptyState";
import LibraryMap from "../components/LibraryMap";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SearchBar from "../components/SearchBar";
import SearchFilters, {
  type SearchFiltersState,
} from "../components/SearchFilters";
import TrendingNearYou from "../components/TrendingNearYou";
import { addToRun } from "@/app/lib/bookRun";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";

function libraryKeyFromEdition(e: Edition) {
  return `${e.library_name}|${e.latitude}|${e.longitude}`;
}

export default function SearchClient() {
  const params = useSearchParams();
  const initialQuery = params.get("q") || "";
  const similarTitle = params.get("similar") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Edition[]>([]);
  const [similar, setSimilar] = useState<
    { title: string; author: string; reason: string }[]
  >([]);
  const [runToast, setRunToast] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fuzzyNote, setFuzzyNote] = useState<string | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState<SearchFiltersState>({
    radius: "",
    availableOnly: false,
    openNowOnly: false,
    sort: "best",
  });

  const mapLibraries = useMemo(() => {
    const seen = new Set<string>();
    const libs: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    }[] = [];

    for (const edition of results) {
      for (const c of edition.copies || []) {
        if (
          typeof c.latitude !== "number" ||
          typeof c.longitude !== "number" ||
          Number.isNaN(c.latitude) ||
          Number.isNaN(c.longitude)
        ) {
          continue;
        }
        const id = `${c.library_name}|${c.latitude}|${c.longitude}`;
        if (seen.has(id)) continue;
        seen.add(id);
        libs.push({
          id,
          name: c.library_name,
          latitude: c.latitude,
          longitude: c.longitude,
        });
      }
    }
    return libs;
  }, [results]);

  const trackClick = async (edition: Edition) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: edition.title,
          library_name: edition.library_name,
          query,
        }),
      });
    } catch {
      /* non-blocking */
    }
  };

  const selectLibrary = (id: string) => {
    setSelectedLibraryId(id);
    const safe = id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const card = document.querySelector(
      `[data-library-id="${safe}"]`
    ) as HTMLElement | null;
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const fetchBooks = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setFuzzyNote(null);
    setSelectedLibraryId(null);

    if (!navigator.geolocation) {
      setError("Location access is required");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = new URL(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/search`
          );
          url.searchParams.set("q", q);
          url.searchParams.set("lat", String(pos.coords.latitude));
          url.searchParams.set("lng", String(pos.coords.longitude));
          url.searchParams.set("sort", filters.sort);
          if (filters.radius) url.searchParams.set("radius", filters.radius);
          if (filters.availableOnly) url.searchParams.set("available", "true");
          if (filters.openNowOnly) url.searchParams.set("openNow", "true");

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error("Failed");

          const payload = await res.json();
          const data = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.results)
              ? payload.results
              : [];
          const meta = payload.meta;

          // Support both grouped editions and legacy flat rows
          const mapped: Edition[] = data.map((b: any) => {
            if (Array.isArray(b.copies)) {
              return b as Edition;
            }
            return {
              key: `${b.title}|${b.author}|${b.library_name}`,
              title: b.title,
              author: b.author,
              isbns: b.isbn ? [b.isbn] : [],
              copy_count: 1,
              library_count: 1,
              best_distance: b.distance ?? null,
              available: b.available !== false,
              open_now: b.open_now === true,
              library_name: b.library_name,
              latitude: b.latitude,
              longitude: b.longitude,
              distance: b.distance,
              copies: [
                {
                  library_name: b.library_name,
                  distance: b.distance ?? null,
                  available: b.available !== false,
                  latitude: b.latitude,
                  longitude: b.longitude,
                  isbn: b.isbn,
                  opens_at: b.opens_at,
                  closes_at: b.closes_at,
                  open_now: b.open_now,
                },
              ],
            };
          });

          setResults(mapped);

          if (meta?.fuzzy && meta?.suggestion) {
            setFuzzyNote(`Showing close matches for “${meta.suggestion}”`);
          }
        } catch {
          setError("Failed to fetch books");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    if (initialQuery) fetchBooks(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!similarTitle && !query) {
      setSimilar([]);
      return;
    }
    const title = similarTitle || results[0]?.title;
    const author = results[0]?.author || "";
    if (!title) return;

    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/similar?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`
    )
      .then((r) => r.json())
      .then((d) => setSimilar(Array.isArray(d) ? d : []))
      .catch(() => setSimilar([]));
  }, [similarTitle, results, query]);

  const createAlert = async () => {
    setAlertMsg("");
    const q = query.trim();
    if (!q) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAlertMsg("Login required to create an alert");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reader/alerts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              query: q,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              radius_km: Number(filters.radius) || 25,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Alert failed");
        setAlertMsg("Alert saved — check your dashboard for matches");
      } catch (e: any) {
        setAlertMsg(e.message || "Alert failed");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1
        className="text-3xl font-semibold mb-2 text-[#D4AF37]"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Find books near you
      </h1>
      <p className="text-gray-400 mb-6">
        Editions grouped across libraries. Filter by distance, stock, and open
        now.
      </p>

      <SearchBar
        query={query}
        setQuery={setQuery}
        onSearch={fetchBooks}
        loading={loading}
      />

      <SearchFilters filters={filters} setFilters={setFilters} />

      <button
        type="button"
        onClick={() => fetchBooks()}
        className="mt-3 text-sm text-[#D4AF37] hover:underline mr-4"
      >
        Apply filters
      </button>
      <button
        type="button"
        onClick={createAlert}
        className="mt-3 text-sm text-slate-300 hover:text-[#D4AF37] underline-offset-2 hover:underline"
      >
        Alert me when this is nearby
      </button>
      <Link
        href="/plan"
        className="mt-3 ml-4 text-sm text-[#D4AF37] hover:underline"
      >
        Book-run planner
      </Link>
      {runToast && (
        <p className="mt-2 text-sm text-green-400">{runToast}</p>
      )}
      {alertMsg && (
        <p className="mt-2 text-sm text-amber-200">{alertMsg}</p>
      )}

      {!initialQuery && !results.length && !loading && <TrendingNearYou />}

      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg text-[#D4AF37] mb-3">Books like this</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {similar.map((s) => (
              <li key={s.title}>
                <button
                  type="button"
                  className="w-full text-left rounded-lg border border-slate-700 px-3 py-2 hover:border-[#D4AF37]"
                  onClick={() => {
                    setQuery(s.title);
                    fetchBooks(s.title);
                  }}
                >
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-slate-400">
                    {s.author} · {s.reason}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fuzzyNote && (
        <p className="mt-4 text-sm text-amber-300/90">{fuzzyNote}</p>
      )}

      <div className="mt-8 space-y-4">
        {loading && <LoadingSkeleton />}
        {!loading && error && (
          <p className="text-red-400 text-center">{error}</p>
        )}
        {!loading && !error && results.length === 0 && query && (
          <EmptyState
            onTrySuggestion={(s) => {
              setQuery(s);
              fetchBooks(s);
            }}
          />
        )}

        {results.map((edition) => {
          const id = libraryKeyFromEdition(edition);
          return (
            <div key={edition.key} data-library-id={id}>
              <EditionResultCard
                edition={edition}
                selected={selectedLibraryId === id}
                onSelect={selectLibrary}
                onEngage={() => trackClick(edition)}
                onAddToRun={(stop) => {
                  addToRun(stop);
                  setRunToast(`Added “${stop.title}” to book run`);
                  setTimeout(() => setRunToast(""), 2500);
                }}
              />
            </div>
          );
        })}
      </div>

      {!loading && mapLibraries.length > 0 && (
        <LibraryMap
          libraries={mapLibraries}
          selectedId={selectedLibraryId}
          onSelect={selectLibrary}
        />
      )}
    </div>
  );
}
