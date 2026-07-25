"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BookResultCard from "../components/BookResultCard";
import EmptyState from "../components/EmptyState";
import LibraryMap from "../components/LibraryMap";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SearchBar from "../components/SearchBar";
import SearchFilters, {
  type SearchFiltersState,
} from "../components/SearchFilters";

type SearchBook = {
  title: string;
  author: string;
  libraryName: string;
  distance: number;
  available: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

export default function SearchClient() {
  const params = useSearchParams();
  const initialQuery = params.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fuzzyNote, setFuzzyNote] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFiltersState>({
    radius: "",
    availableOnly: false,
    sort: "distance",
  });

  const mapLibraries = useMemo(() => {
    const seen = new Set<string>();
    return results
      .filter(
        (b) =>
          typeof b.latitude === "number" &&
          typeof b.longitude === "number" &&
          !Number.isNaN(b.latitude) &&
          !Number.isNaN(b.longitude)
      )
      .filter((b) => {
        const key = `${b.libraryName}-${b.latitude}-${b.longitude}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((b) => ({
        name: b.libraryName,
        latitude: b.latitude as number,
        longitude: b.longitude as number,
      }));
  }, [results]);

  const fetchBooks = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setFuzzyNote(null);

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

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error("Failed");

          const payload = await res.json();
          const data = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.results)
              ? payload.results
              : [];
          const meta = payload.meta;

          const mapped: SearchBook[] = data.map((b: any) => ({
            title: b.title,
            author: b.author,
            libraryName: b.library_name,
            distance: b.distance ?? 0,
            available: b.available !== false,
            latitude: b.latitude ?? b.libraries?.latitude ?? null,
            longitude: b.longitude ?? b.libraries?.longitude ?? null,
          }));

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
        Search by title, author, or ISBN. Autocomplete and filters included.
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

      {fuzzyNote && (
        <p className="mt-4 text-sm text-amber-300/90">{fuzzyNote}</p>
      )}

      <div className="mt-8 space-y-4">
        {loading && <LoadingSkeleton />}
        {!loading && error && (
          <p className="text-red-400 text-center">{error}</p>
        )}
        {!loading && !error && results.length === 0 && (
          <EmptyState
            onTrySuggestion={(s) => {
              setQuery(s);
              fetchBooks(s);
            }}
          />
        )}

        {results.map((book, i) => (
          <BookResultCard key={i} book={book} />
        ))}
      </div>

      {!loading && mapLibraries.length > 0 && (
        <LibraryMap libraries={mapLibraries} />
      )}
    </div>
  );
}
