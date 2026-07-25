"use client";

const FALLBACKS = [
  "Atomic Habits",
  "Deep Work",
  "Clean Code",
  "The Alchemist",
];

export default function EmptyState({
  onTrySuggestion,
}: {
  onTrySuggestion?: (q: string) => void;
}) {
  return (
    <div className="text-center text-slate-400 mt-10 space-y-4">
      <p>No books found nearby. Try a different search.</p>
      {onTrySuggestion && (
        <div className="flex flex-wrap justify-center gap-2">
          {FALLBACKS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onTrySuggestion(s)}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-[#D4AF37] hover:border-[#D4AF37]"
            >
              Try “{s}”
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
