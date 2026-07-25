"use client";

import { useState } from "react";
import Chip from "./ui/Chip";

export type SearchFiltersState = {
  radius: string;
  availableOnly: boolean;
  openNowOnly: boolean;
  sort: "best" | "distance" | "title" | "author";
};

interface Props {
  filters: SearchFiltersState;
  setFilters: (next: SearchFiltersState) => void;
}

export default function SearchFilters({ filters, setFilters }: Props) {
  const [more, setMore] = useState(false);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Chip
          active={filters.sort === "best"}
          onClick={() => setFilters({ ...filters, sort: "best" })}
        >
          Best
        </Chip>
        <Chip
          active={filters.sort === "distance"}
          onClick={() => setFilters({ ...filters, sort: "distance" })}
        >
          Nearest
        </Chip>
        <Chip
          active={filters.availableOnly}
          onClick={() =>
            setFilters({ ...filters, availableOnly: !filters.availableOnly })
          }
        >
          In stock
        </Chip>
        <Chip
          active={filters.openNowOnly}
          onClick={() =>
            setFilters({ ...filters, openNowOnly: !filters.openNowOnly })
          }
        >
          Open now
        </Chip>
        <button
          type="button"
          className="text-xs text-bs-muted hover:text-bs-teal underline-offset-2 hover:underline ml-1"
          onClick={() => setMore((v) => !v)}
        >
          {more ? "Fewer filters" : "More filters"}
        </button>
      </div>

      {more && (
        <div className="flex flex-wrap gap-3 items-end bs-fade-in">
          <label className="flex flex-col gap-1 text-xs text-bs-muted">
            Within
            <select
              value={filters.radius}
              onChange={(e) =>
                setFilters({ ...filters, radius: e.target.value })
              }
              className="rounded-lg bg-bs-surface border border-bs-line px-3 py-2 text-sm text-bs-ink"
            >
              <option value="">Any distance</option>
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-bs-muted">
            Sort
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  sort: e.target.value as SearchFiltersState["sort"],
                })
              }
              className="rounded-lg bg-bs-surface border border-bs-line px-3 py-2 text-sm text-bs-ink"
            >
              <option value="best">Best match</option>
              <option value="distance">Nearest</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
