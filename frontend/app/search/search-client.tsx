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

function libraryKeyFromEdition(e: Edition) {
  return `${e.library_name}|${e.latitude}|${e.longitude}`;
}

export default function SearchClient() {
  const params = useSearchParams();
  const initialQuery = params.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Edition[]>([]);
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
        className="mt-3 text-sm text-[#D4AF37] hover:underline"
      >
        Apply filters
      </button>

      {!initialQuery && !results.length && !loading && <TrendingNearYou />}

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
