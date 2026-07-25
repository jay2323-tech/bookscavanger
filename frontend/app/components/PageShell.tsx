import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** tighter width for reading / auth */
  narrow?: boolean;
  /** show map-grid atmosphere */
  grid?: boolean;
};

/** Shared page frame for Map & field UI */
export default function PageShell({
  children,
  className = "",
  narrow = false,
  grid = true,
}: Props) {
  return (
    <div className={`relative min-h-[calc(100vh-4.5rem)] ${grid ? "bs-paper-grid" : ""}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_10%_0%,rgba(15,118,110,0.08),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_10%,rgba(201,162,39,0.1),transparent_50%)]"
      />
      <div
        className={`relative mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-10 ${
          narrow ? "max-w-xl" : "max-w-6xl"
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
