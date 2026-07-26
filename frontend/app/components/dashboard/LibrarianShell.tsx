import type { ReactNode } from "react";

export function PageHeader({
  eyebrow = "Library",
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-bs-muted mb-2">
          {eyebrow}
        </p>
        <h1
          className="text-3xl md:text-4xl text-bs-ink tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-bs-muted text-sm md:text-base max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function MetricStrip({
  items,
}: {
  items: { label: string; value: string | number; tone?: string }[];
}) {
  return (
    <section className="mb-8 border-y border-bs-line py-6">
      <div
        className={`grid gap-8 sm:divide-x divide-bs-line ${
          items.length === 4
            ? "grid-cols-2 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {items.map((item, i) => (
          <div key={item.label} className={i > 0 ? "sm:pl-8" : ""}>
            <p className="text-xs uppercase tracking-[0.12em] text-bs-muted mb-1.5">
              {item.label}
            </p>
            <p
              className={`text-3xl tracking-tight tabular-nums ${
                item.tone || "text-bs-ink"
              }`}
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: ReactNode;
}) {
  const cls =
    tone === "error"
      ? "border-bs-danger/25 bg-bs-danger/5 text-bs-danger"
      : "border-bs-ok/25 bg-bs-ok/5 text-bs-ok";
  return (
    <p className={`mb-4 text-sm rounded-lg border px-3 py-2 ${cls}`}>
      {children}
    </p>
  );
}
