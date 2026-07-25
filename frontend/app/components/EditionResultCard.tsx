"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import BookCover from "./BookCover";
import StatusDot from "./ui/StatusDot";
import Button from "./ui/Button";

export type EditionCopy = {
  id?: string | number;
  library_name: string;
  distance: number | null;
  available: boolean;
  latitude?: number | null;
  longitude?: number | null;
  isbn?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  open_now?: boolean | null;
  library_id?: string | number | null;
};

export type Edition = {
  key: string;
  title: string;
  author: string;
  isbns?: string[];
  copy_count: number;
  library_count: number;
  best_distance: number | null;
  available: boolean;
  open_now?: boolean;
  library_name: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number | null;
  found_count?: number;
  cover_url?: string | null;
  publish_year?: number | null;
  subjects?: string[];
  primary_isbn?: string | null;
  copies: EditionCopy[];
};

interface Props {
  edition: Edition;
  selected?: boolean;
  onSelect?: (libraryKey: string) => void;
  onEngage?: () => void;
  onAddToRun?: (stop: {
    title: string;
    library_name: string;
    latitude: number;
    longitude: number;
    distance: number | null;
  }) => void;
}

function libraryKey(c: EditionCopy) {
  return `${c.library_name}|${c.latitude}|${c.longitude}`;
}

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function EditionResultCard({
  edition,
  selected,
  onSelect,
  onEngage,
  onAddToRun,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const nearest = edition.copies[0];

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const requestHold = async (copy?: EditionCopy) => {
    setMsg("");
    const token = await getToken();
    if (!token) {
      setMsg("Login required to request a hold");
      return;
    }
    const c = copy || nearest;
    try {
      const res = await fetch(`${backend}/api/reader/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: edition.title,
          author: edition.author,
          library_name: c?.library_name,
          book_id: c?.id ?? null,
          library_id: c?.library_id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hold failed");
      setMsg("Hold requested — library will review it");
      onEngage?.();
    } catch (e: any) {
      setMsg(e.message || "Hold failed");
    }
  };

  const markFound = async (copy?: EditionCopy) => {
    setMsg("");
    const token = await getToken();
    const c = copy || nearest;
    try {
      const res = await fetch(`${backend}/api/books/found`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: edition.title,
          author: edition.author,
          library_name: c?.library_name,
          book_id: c?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Thanks — marked as found");
      onEngage?.();
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
  };

  const directionsHref =
    nearest?.latitude != null && nearest?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${nearest.latitude},${nearest.longitude}`
      : null;

  return (
    <article
      className={`bg-bs-surface border rounded-xl p-4 sm:p-5 transition ${
        selected
          ? "border-bs-teal ring-1 ring-bs-teal/30"
          : "border-bs-line hover:border-bs-teal/40"
      }`}
    >
      <div className="flex gap-4">
        <button
          type="button"
          className="text-left flex gap-4 min-w-0 flex-1"
          onClick={() => {
            onEngage?.();
            if (nearest) onSelect?.(libraryKey(nearest));
          }}
        >
          <BookCover src={edition.cover_url} title={edition.title} />
          <div className="min-w-0">
            <h3
              className="text-lg sm:text-xl font-semibold leading-snug text-bs-ink"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {edition.title}
            </h3>
            <p className="text-bs-muted text-sm mt-0.5">{edition.author}</p>
            {(edition.publish_year || edition.subjects?.length) && (
              <p className="mt-1 text-xs text-bs-muted">
                {edition.publish_year ? String(edition.publish_year) : ""}
                {edition.publish_year && edition.subjects?.length ? " · " : ""}
                {edition.subjects?.slice(0, 2).join(" · ")}
              </p>
            )}
            <p className="mt-2 text-sm text-bs-ink/80">
              <span className="text-bs-teal font-medium">
                {edition.best_distance != null
                  ? `${edition.best_distance.toFixed(1)} km`
                  : "Distance unknown"}
              </span>
              {" · "}
              {edition.library_name || `${edition.library_count} libraries`}
              {edition.found_count
                ? ` · ${edition.found_count} found recently`
                : ""}
            </p>
          </div>
        </button>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusDot
            tone={edition.available ? "ok" : "danger"}
            label={edition.available ? "In stock" : "Unavailable"}
          />
          {edition.open_now === true && (
            <StatusDot tone="teal" label="Open now" />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {directionsHref ? (
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onEngage?.()}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-bs-gold text-bs-gold-ink hover:brightness-95"
          >
            Directions
          </a>
        ) : (
          <Button type="button" onClick={() => requestHold()}>
            Request hold
          </Button>
        )}

        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
          </Button>
          {moreOpen && (
            <div className="absolute left-0 mt-1 z-20 w-48 rounded-lg border border-bs-line bg-bs-surface shadow-lg overflow-hidden">
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-bs-paper"
                onClick={() => {
                  setMoreOpen(false);
                  void requestHold();
                }}
              >
                Request hold
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-bs-paper"
                onClick={() => {
                  setMoreOpen(false);
                  void markFound();
                }}
              >
                I found it
              </button>
              {nearest?.latitude != null &&
                nearest?.longitude != null &&
                onAddToRun && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-bs-paper"
                    onClick={() => {
                      setMoreOpen(false);
                      onAddToRun({
                        title: edition.title,
                        library_name: nearest.library_name,
                        latitude: nearest.latitude as number,
                        longitude: nearest.longitude as number,
                        distance: nearest.distance,
                      });
                    }}
                  >
                    Add to book run
                  </button>
                )}
              <Link
                href={`/search?q=${encodeURIComponent(edition.author || edition.title)}&similar=${encodeURIComponent(edition.title)}`}
                className="block px-3 py-2.5 text-sm hover:bg-bs-paper text-bs-teal"
                onClick={() => {
                  setMoreOpen(false);
                  onEngage?.();
                }}
              >
                Books like this
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="text-sm text-bs-teal hover:underline px-1 ml-auto"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide locations" : `${edition.copy_count} locations`}
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-bs-teal">{msg}</p>}

      {expanded && (
        <ul className="mt-3 space-y-2 border-t border-bs-line pt-3">
          {edition.copies.map((c, i) => (
            <li
              key={`${c.library_name}-${i}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
            >
              <button
                type="button"
                className="text-left hover:text-bs-teal"
                onClick={() => {
                  onEngage?.();
                  onSelect?.(libraryKey(c));
                }}
              >
                <span className="font-medium">{c.library_name}</span>
                {c.distance != null ? ` · ${c.distance.toFixed(1)} km` : ""}
                {c.open_now === true
                  ? " · Open"
                  : c.opens_at && c.closes_at
                    ? ` · ${c.opens_at}–${c.closes_at}`
                    : ""}
              </button>
              {c.latitude != null && c.longitude != null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bs-teal hover:underline font-medium"
                >
                  Directions
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
