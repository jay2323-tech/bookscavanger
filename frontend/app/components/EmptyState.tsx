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
    <div className="text-center text-bs-muted mt-8 space-y-4 py-8">
      <p className="text-bs-ink font-medium">No copies found nearby.</p>
      <p className="text-sm">Try a different title, author, or ISBN.</p>
      {onTrySuggestion && (
        <div className="flex flex-wrap justify-center gap-2">
          {FALLBACKS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onTrySuggestion(s)}
              className="text-sm px-3 py-1.5 rounded-full border border-bs-line bg-bs-surface text-bs-teal hover:border-bs-teal"
            >
              Try “{s}”
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
