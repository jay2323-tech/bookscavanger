"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import BookCover from "./BookCover";

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

  return (
    <div
      className={`bg-slate-800 border rounded-xl p-5 transition ${
        selected
          ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/40"
          : "border-slate-700 hover:border-[#D4AF37]"
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <button
          type="button"
          className="text-left flex-1 flex gap-4 min-w-0"
          onClick={() => {
            onEngage?.();
            if (nearest) onSelect?.(libraryKey(nearest));
          }}
        >
          <BookCover src={edition.cover_url} title={edition.title} />
          <div className="min-w-0">
            <h3 className="text-xl font-semibold leading-snug">
              {edition.title}
            </h3>
            <p className="text-slate-400">{edition.author}</p>
            {(edition.publish_year || edition.subjects?.length) && (
              <p className="mt-1 text-xs text-slate-500">
                {edition.publish_year ? String(edition.publish_year) : ""}
                {edition.publish_year && edition.subjects?.length ? " · " : ""}
                {edition.subjects?.slice(0, 2).join(" · ")}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-300">
              {edition.library_count} librar
              {edition.library_count === 1 ? "y" : "ies"} · {edition.copy_count}{" "}
              {edition.copy_count === 1 ? "copy" : "copies"}
              {edition.best_distance != null
                ? ` · nearest ${edition.best_distance.toFixed(1)} km`
                : ""}
              {edition.found_count
                ? ` · ${edition.found_count} found recently`
                : ""}
            </p>
          </div>
        </button>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`text-sm px-3 py-1 rounded-full ${
              edition.available
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {edition.available ? "Available" : "Not Available"}
          </span>
          {edition.open_now === true && (
            <span className="text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-300">
              Open now
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => requestHold()}
          className="text-sm px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-medium"
        >
          Request hold
        </button>
        <button
          type="button"
          onClick={() => markFound()}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200"
        >
          I found it
        </button>
        {nearest?.latitude != null &&
          nearest?.longitude != null &&
          onAddToRun && (
            <button
              type="button"
              onClick={() =>
                onAddToRun({
                  title: edition.title,
                  library_name: nearest.library_name,
                  latitude: nearest.latitude as number,
                  longitude: nearest.longitude as number,
                  distance: nearest.distance,
                })
              }
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200"
            >
              Add to book run
            </button>
          )}
        <Link
          href={`/search?q=${encodeURIComponent(edition.author || edition.title)}&similar=${encodeURIComponent(edition.title)}`}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-[#D4AF37]"
          onClick={() => onEngage?.()}
        >
          Books like this
        </Link>
        <button
          type="button"
          className="text-sm text-[#D4AF37] hover:underline px-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Hide editions"
            : `Show ${edition.copy_count} locations`}
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-amber-200/90">{msg}</p>}

      {expanded && (
        <ul className="mt-3 space-y-2 border-t border-slate-700 pt-3">
          {edition.copies.map((c, i) => (
            <li
              key={`${c.library_name}-${i}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
            >
              <button
                type="button"
                className="text-left hover:text-[#D4AF37]"
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="text-[#D4AF37] hover:underline"
                  onClick={() => requestHold(c)}
                >
                  Hold
                </button>
                <button
                  type="button"
                  className="text-slate-300 hover:underline"
                  onClick={() => markFound(c)}
                >
                  Found
                </button>
                {c.latitude != null && c.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4AF37] hover:underline"
                  >
                    Directions
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
