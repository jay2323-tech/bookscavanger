"use client";

import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import EditionResultCard, {
  type Edition,
} from "../components/EditionResultCard";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SearchBar from "../components/SearchBar";
import SearchFilters, {
  type SearchFiltersState,
} from "../components/SearchFilters";
import TrendingNearYou from "../components/TrendingNearYou";
import PageShell from "../components/PageShell";
import { addToRun } from "@/app/lib/bookRun";
import {
  clearPendingDirections,
  guestNeedsLoginForDirections,
  loginHrefForDirections,
  peekPendingDirections,
  recordGuestSearch,
} from "@/app/lib/guestSearchGate";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";

const LibraryMap = dynamic(() => import("../components/LibraryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-xl border border-bs-line bg-bs-paper animate-pulse" />
  ),
});

const GEO_KEY = "bs_last_geo";

function readCachedGeo(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lng === "number" &&
      !Number.isNaN(parsed.lat) &&
      !Number.isNaN(parsed.lng)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedGeo(lat: number, lng: number) {
  try {
    sessionStorage.setItem(GEO_KEY, JSON.stringify({ lat, lng }));
  } catch {
    /* ignore */
  }
}

function libraryKeyFromEdition(e: Edition) {
  return `${e.library_name}|${e.latitude}|${e.longitude}`;
}

export default function SearchClient({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const params = useSearchParams();
  const initialQuery = params.get("q") || "";
  const similarTitle = params.get("similar") || "";
  const planHref = "/plan";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Edition[]>([]);
  const [similar, setSimilar] = useState<
    { title: string; author: string; reason: string }[]
  >([]);
  const [runToast, setRunToast] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [fuzzyNote, setFuzzyNote] = useState<string | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null
  );
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [gateDirections, setGateDirections] = useState(false);
  const [pendingDirections, setPendingDirections] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState<SearchFiltersState>({
    radius: "",
    availableOnly: false,
    openNowOnly: false,
    sort: "best",
  });
  const filtersBoot = useRef(true);

  useEffect(() => {
    let alive = true;
    const syncAuth = (hasUser: boolean) => {
      setLoggedIn(hasUser);
      setGateDirections(guestNeedsLoginForDirections(hasUser));
      // Popup-safe: show Continue banner instead of window.open
      setPendingDirections(hasUser ? peekPendingDirections() : null);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      syncAuth(!!data.session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      syncAuth(!!session?.user);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const runSearch = async (q: string, lat?: number, lng?: number) => {
    const url = new URL(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/search`
    );
    url.searchParams.set("q", q);
    if (lat != null && lng != null) {
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
    }
    url.searchParams.set(
      "sort",
      lat != null ? filters.sort : filters.sort === "distance" ? "title" : filters.sort
    );
    if (filters.radius && lat != null) url.searchParams.set("radius", filters.radius);
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

    const mapped: Edition[] = data.map((b: any) => {
      if (Array.isArray(b.copies)) return b as Edition;
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
        cover_url: b.cover_url,
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
            verified: b.verified === true,
          },
        ],
      };
    });

    setResults(mapped);
    if (meta?.fuzzy && meta?.suggestion) {
      setFuzzyNote(`Showing close matches for “${meta.suggestion}”`);
    }

    // Guests: after 1 search, directions require login
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      recordGuestSearch();
      setGateDirections(true);
    } else {
      setGateDirections(false);
    }
  };

  const handleDirectionsGate = (mapsUrl: string) => {
    window.location.href = loginHrefForDirections(mapsUrl);
  };

  const fetchBooks = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    // Only show skeleton on first empty load — keep prior results visible (SWR)
    const firstLoad = results.length === 0;
    if (firstLoad) setLoading(true);
    setError("");
    setFuzzyNote(null);
    setLocationNote(null);
    setSelectedLibraryId(null);

    const cached = readCachedGeo();

    try {
      if (cached) {
        await runSearch(q, cached.lat, cached.lng);
      } else {
        setLocationNote(
          "Enable location for distance ranking and nearby filters."
        );
        await runSearch(q);
      }
    } catch {
      setError("Failed to fetch books");
    } finally {
      setLoading(false);
    }

    // Refine with fresh GPS in the background (do not block first paint)
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        writeCachedGeo(lat, lng);
        const same =
          cached &&
          Math.abs(cached.lat - lat) < 0.001 &&
          Math.abs(cached.lng - lng) < 0.001;
        if (same) {
          setLocationNote(null);
          return;
        }
        try {
          setLocationNote(null);
          await runSearch(q, lat, lng);
        } catch {
          /* keep first results */
        }
      },
      () => {
        if (!cached) {
          setLocationNote(
            "Enable location for distance ranking and nearby filters."
          );
        }
      },
      { maximumAge: 60_000, timeout: 8000 }
    );
  };

  useEffect(() => {
    if (initialQuery) fetchBooks(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-apply filters when they change (after first search exists)
  useEffect(() => {
    if (filtersBoot.current) {
      filtersBoot.current = false;
      return;
    }
    if (!query.trim() && !results.length) return;
    const t = setTimeout(() => fetchBooks(), 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!similarTitle && !results.length) {
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
  }, [similarTitle, results]);

  const createAlert = async () => {
    setAlertMsg("");
    const q = query.trim();
    if (!q) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`
      );
      window.location.href = `/library/login?next=${next}`;
      return;
    }

    if (!navigator.geolocation) {
      setAlertMsg("Location required for alerts");
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

  const mapPane =
    mapLibraries.length > 0 ? (
      <LibraryMap
        libraries={mapLibraries}
        selectedId={selectedLibraryId}
        onSelect={selectLibrary}
        compact
        requireLoginForDirections={gateDirections}
        onDirectionsGate={handleDirectionsGate}
      />
    ) : null;

  const body = (
      <div className="bs-fade-in">
        {!embedded && (
          <p
            className="text-sm font-semibold text-bs-teal mb-1"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            BookScavenger
          </p>
        )}
        <h1
          className="text-2xl sm:text-3xl font-semibold text-bs-ink mb-1"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Find a book nearby
        </h1>
        <p className="text-bs-muted mb-5 text-sm sm:text-base max-w-xl">
          Search title, author, or ISBN — then get directions to the nearest copy.
        </p>

        {pendingDirections && loggedIn && (
          <div className="mb-4 rounded-xl border border-bs-gold/40 bg-bs-gold/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-bs-ink">
              You’re signed in — open directions to the library you picked.
            </p>
            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href={pendingDirections}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  clearPendingDirections();
                  setPendingDirections(null);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-bs-gold px-4 py-2 text-sm font-semibold text-bs-gold-ink hover:brightness-95"
              >
                Continue to directions
              </a>
              <button
                type="button"
                onClick={() => {
                  clearPendingDirections();
                  setPendingDirections(null);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-bs-line px-3 py-2 text-sm text-bs-muted hover:text-bs-ink"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {gateDirections && !loggedIn && results.length > 0 && (
          <div className="mb-4 rounded-xl border border-bs-teal/25 bg-bs-teal-soft/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-bs-ink">
              Sign in free for directions — also unlocks holds and nearby
              alerts.
            </p>
            <Link
              href={loginHrefForDirections()}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-bs-gold px-4 py-2 text-sm font-semibold text-bs-gold-ink hover:brightness-95"
            >
              Sign in for directions
            </Link>
          </div>
        )}

        <div className="sticky top-16 z-30 -mx-1 px-1 py-3 bg-bs-paper/90 backdrop-blur-sm border-b border-bs-line/60 mb-4">
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={fetchBooks}
            loading={loading}
          />
          <SearchFilters filters={filters} setFilters={setFilters} />
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={createAlert}
              className="text-bs-muted hover:text-bs-teal"
            >
              Alert me nearby
            </button>
            <Link href={planHref} className="text-bs-teal hover:underline">
              Book-run planner
            </Link>
            {mapLibraries.length > 0 && (
              <button
                type="button"
                className="lg:hidden text-bs-teal font-medium"
                onClick={() => setShowMapMobile((v) => !v)}
              >
                {showMapMobile ? "Hide map" : "Show map"}
              </button>
            )}
          </div>
          {runToast && <p className="mt-2 text-sm text-bs-ok">{runToast}</p>}
          {alertMsg && <p className="mt-2 text-sm text-bs-teal">{alertMsg}</p>}
          {locationNote && (
            <p className="mt-2 text-sm text-bs-muted">{locationNote}</p>
          )}
          {fuzzyNote && (
            <p className="mt-2 text-sm text-bs-gold">{fuzzyNote}</p>
          )}
        </div>

        {!initialQuery && !results.length && !loading && <TrendingNearYou />}

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
          <div className="space-y-3 bs-stagger">
            {loading && results.length === 0 && <LoadingSkeleton />}
            {!loading && error && (
              <p className="text-bs-danger text-center py-6">{error}</p>
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
                    requireLoginForDirections={gateDirections}
                    onDirectionsGate={handleDirectionsGate}
                    onAddToRun={(stop) => {
                      addToRun(stop);
                      setRunToast(`Added “${stop.title}” to book run`);
                      setTimeout(() => setRunToast(""), 2500);
                    }}
                  />
                </div>
              );
            })}

            {similar.length > 0 && results.length > 0 && (
              <section className="pt-6 mt-4 border-t border-bs-line">
                <h2
                  className="text-lg text-bs-ink mb-3"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  Books like this
                </h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {similar.map((s) => (
                    <li key={s.title}>
                      <button
                        type="button"
                        className="w-full text-left rounded-lg border border-bs-line bg-bs-surface px-3 py-2 hover:border-bs-teal"
                        onClick={() => {
                          setQuery(s.title);
                          fetchBooks(s.title);
                        }}
                      >
                        <p className="font-medium text-bs-ink">{s.title}</p>
                        <p className="text-xs text-bs-muted">
                          {s.author} · {s.reason}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="hidden lg:block sticky top-28 mt-0">
            {mapPane}
          </aside>
        </div>

        {showMapMobile && (
          <div className="lg:hidden mt-6 bs-fade-in">{mapPane}</div>
        )}
      </div>
  );

  if (embedded) {
    return <div className="max-w-7xl">{body}</div>;
  }

  return <PageShell className="!max-w-7xl">{body}</PageShell>;
}
