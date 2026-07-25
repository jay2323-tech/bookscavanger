interface Props {
  query: string
  setQuery: (v: string) => void
  onSearch: () => void
  loading: boolean
}

export default function SearchBar({ query, setQuery, onSearch, loading }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <input
        type="text"
        placeholder="Search by book name, author, or ISBN..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
      />
      <button
        onClick={onSearch}
        disabled={loading}
        className="rounded-lg bg-[#D4AF37] text-slate-900 px-6 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </div>
  )
}
