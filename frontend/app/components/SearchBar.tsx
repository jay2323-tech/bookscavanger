"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Suggestion = {
  type: "title" | "author";
  label: string;
  secondary?: string | null;
};

interface Props {
  query: string;
  setQuery: (v: string) => void;
  onSearch: (override?: string) => void;
  loading: boolean;
}

export default function SearchBar({
  query,
  setQuery,
  onSearch,
  loading,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${backend}/api/books/suggest?q=${encodeURIComponent(query.trim())}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* ignore suggest errors */
      }
    }, 220);

    return () => clearTimeout(t);
  }, [query, backend]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (label: string) => {
    setQuery(label);
    setOpen(false);
    onSearch(label);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) {
        pick(suggestions[active].label);
      } else {
        setOpen(false);
        onSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search by book name, author, or ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          autoComplete="off"
        />

        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shadow-lg">
            {suggestions.map((s, i) => (
              <li key={`${s.type}-${s.label}`}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-3 text-sm ${
                    i === active ? "bg-slate-800" : "hover:bg-slate-800"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s.label)}
                >
                  <span className="font-medium text-[#F8F5F0]">{s.label}</span>
                  {s.secondary && (
                    <span className="block text-xs text-slate-400 mt-0.5">
                      {s.type === "author" ? "Author" : s.secondary}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => {
          setOpen(false);
          onSearch();
        }}
        disabled={loading}
        className="rounded-lg bg-[#D4AF37] text-slate-900 px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Searching..." : "Search"}
      </button>
    </div>
  );
}
