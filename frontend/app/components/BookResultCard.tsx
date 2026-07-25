"use client";

interface Props {
  book: {
    title: string;
    author: string;
    libraryName: string;
    distance: number;
    available: boolean;
    latitude?: number | null;
    longitude?: number | null;
  };
  selected?: boolean;
  onSelect?: () => void;
  cardId?: string;
}

export default function BookResultCard({
  book,
  selected,
  onSelect,
  cardId,
}: Props) {
  const hasCoords =
    typeof book.latitude === "number" &&
    typeof book.longitude === "number" &&
    !Number.isNaN(book.latitude) &&
    !Number.isNaN(book.longitude);

  return (
    <div
      id={cardId}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`bg-slate-800 border rounded-xl p-5 transition cursor-pointer ${
        selected
          ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/40"
          : "border-slate-700 hover:border-[#D4AF37]"
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-xl font-semibold">{book.title}</h3>
          <p className="text-slate-400">{book.author}</p>
          <p className="mt-2 text-sm text-slate-300">
            {book.libraryName}
            {typeof book.distance === "number"
              ? ` · ${book.distance.toFixed(1)} km away`
              : ""}
          </p>
          {hasCoords && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${book.latitude},${book.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-[#D4AF37] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Directions →
            </a>
          )}
        </div>

        <span
          className={`text-sm px-3 py-1 rounded-full shrink-0 ${
            book.available
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {book.available ? "Available" : "Not Available"}
        </span>
      </div>
    </div>
  );
}
