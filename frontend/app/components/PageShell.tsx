import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** tighter width for reading / auth */
  narrow?: boolean;
  /** soft field wash (default on) */
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
    <div
      className={`relative min-h-[calc(100vh-4.5rem)] ${grid ? "bs-field" : "bg-bs-paper"}`}
    >
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
