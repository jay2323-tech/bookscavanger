import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
};

/** Shared frame for login / signup / onboarding / pending / rejected */
export default function AuthShell({
  eyebrow = "BookScavenger",
  title,
  subtitle,
  children,
  wide = false,
}: Props) {
  return (
    <main className="bs-field min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4 py-12">
      <div
        className={`w-full ${wide ? "max-w-lg" : "max-w-md"} bs-fade-in`}
      >
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.14em] text-bs-muted mb-2">
            {eyebrow}
          </p>
          <h1
            className="text-3xl text-bs-ink tracking-tight"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-bs-muted max-w-sm mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-bs-line bg-bs-surface/90 backdrop-blur-sm p-6 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
