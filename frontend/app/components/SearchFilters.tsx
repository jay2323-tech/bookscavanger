"use client";

export type SearchFiltersState = {
  radius: string;
  availableOnly: boolean;
  sort: "distance" | "title" | "author";
};

interface Props {
  filters: SearchFiltersState;
  setFilters: (next: SearchFiltersState) => void;
}

export default function SearchFilters({ filters, setFilters }: Props) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
      <label className="flex flex-col gap-1 text-sm text-gray-400">
        Within
        <select
          value={filters.radius}
          onChange={(e) =>
            setFilters({ ...filters, radius: e.target.value })
          }
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-[#F8F5F0]"
        >
          <option value="">Any distance</option>
          <option value="2">2 km</option>
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="25">25 km</option>
          <option value="50">50 km</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-400">
        Sort by
        <select
          value={filters.sort}
          onChange={(e) =>
            setFilters({
              ...filters,
              sort: e.target.value as SearchFiltersState["sort"],
            })
          }
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-[#F8F5F0]"
        >
          <option value="distance">Nearest</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-300 pb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.availableOnly}
          onChange={(e) =>
            setFilters({ ...filters, availableOnly: e.target.checked })
          }
          className="accent-[#D4AF37]"
        />
        In stock only
      </label>
    </div>
  );
}
