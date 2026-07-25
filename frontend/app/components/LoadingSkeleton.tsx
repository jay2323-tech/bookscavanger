export default function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 bg-bs-surface border border-bs-line rounded-xl"
        />
      ))}
    </div>
  );
}
