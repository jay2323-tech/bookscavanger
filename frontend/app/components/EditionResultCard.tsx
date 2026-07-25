"use client";

import { useState } from "react";

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
  copies: EditionCopy[];
};

interface Props {
  edition: Edition;
  selected?: boolean;
  onSelect?: (libraryKey: string) => void;
  onEngage?: () => void;
}

function libraryKey(c: EditionCopy) {
  return `${c.library_name}|${c.latitude}|${c.longitude}`;
}

export default function EditionResultCard({
  edition,
  selected,
  onSelect,
  onEngage,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const nearest = edition.copies[0];

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
          className="text-left flex-1"
          onClick={() => {
            onEngage?.();
            if (nearest) onSelect?.(libraryKey(nearest));
          }}
        >
          <h3 className="text-xl font-semibold">{edition.title}</h3>
          <p className="text-slate-400">{edition.author}</p>
          <p className="mt-2 text-sm text-slate-300">
            {edition.library_count} librar
            {edition.library_count === 1 ? "y" : "ies"} · {edition.copy_count}{" "}
            {edition.copy_count === 1 ? "copy" : "copies"}
            {edition.best_distance != null
              ? ` · nearest ${edition.best_distance.toFixed(1)} km`
              : ""}
          </p>
          {edition.isbns && edition.isbns.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              ISBN {edition.isbns.slice(0, 3).join(", ")}
              {edition.isbns.length > 3 ? "…" : ""}
            </p>
          )}
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

      <button
        type="button"
        className="mt-4 text-sm text-[#D4AF37] hover:underline"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide editions" : `Show ${edition.copy_count} editions / locations`}
      </button>

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
                {c.isbn ? ` · ISBN ${c.isbn}` : ""}
                {c.open_now === true
                  ? " · Open"
                  : c.opens_at && c.closes_at
                    ? ` · ${c.opens_at}–${c.closes_at}`
                    : ""}
              </button>
              <div className="flex items-center gap-3">
                <span
                  className={
                    c.available ? "text-green-400" : "text-red-400"
                  }
                >
                  {c.available ? "In stock" : "Unavailable"}
                </span>
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
