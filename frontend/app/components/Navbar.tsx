"use client";

import { supabase } from "@/app/lib/supabaseClient";
import DashboardNav from "@/app/components/dashboard/Sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const AUTH_PATHS = [
  "/library/login",
  "/library/signup",
  "/library/onboarding",
  "/library/pending",
  "/library/rejected",
  "/library/oauth-callback",
  "/admin/login",
  "/admin/oauth-callback",
];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

const LINKS = [
  { href: "/search", label: "Find books" },
  { href: "/plan", label: "Book run" },
  { href: "/about", label: "About" },
  { href: "/for-libraries", label: "For libraries" },
] as const;

/** Static guest chrome — same HTML on server and first client paint. */
function GuestHeader({
  pathname,
  showLogin,
}: {
  pathname: string;
  showLogin: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const linkClass = (href: string) =>
    `text-sm transition border-b-2 pb-0.5 ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "text-bs-ink border-bs-gold"
        : "text-bs-muted border-transparent hover:text-bs-ink"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-bs-line bg-bs-surface/90 backdrop-blur-md text-bs-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 md:px-10 py-3.5">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-semibold tracking-tight text-bs-ink"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Book<span className="text-bs-gold">Scavenger</span>
          </Link>
          <div className="hidden md:flex items-center gap-5">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showLogin ? (
            <Link
              href="/library/login"
              className="inline-flex text-sm font-semibold bg-bs-gold text-bs-gold-ink px-3 sm:px-4 py-2 rounded-lg hover:brightness-95"
            >
              Login
            </Link>
          ) : null}

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-bs-line bg-bs-surface p-2 text-bs-ink"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="md:hidden border-t border-bs-line bg-bs-surface px-4 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-3 text-sm font-medium ${
                  pathname === l.href
                    ? "bg-bs-teal-soft text-bs-teal"
                    : "text-bs-ink hover:bg-bs-paper"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {showLogin ? (
              <Link
                href="/library/login"
                className="mt-2 rounded-lg bg-bs-gold text-bs-gold-ink px-3 py-3 text-sm font-semibold text-center"
              >
                Login / Signup
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

/**
 * Auth UI only after mount. Until then always render the same guest header
 * (Login hidden) so SSR HTML matches the first client render.
 */
export default function Navbar() {
  const pathname = usePathname() || "/";
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    setMounted(true);

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const isDashboardShell =
    pathname.startsWith("/library/dashboard") ||
    pathname.startsWith("/admin/dashboard");

  if (isDashboardShell) return null;

  // Server + first client paint: identical
  if (!mounted) {
    return <GuestHeader pathname={pathname} showLogin={false} />;
  }

  if (user) return <DashboardNav />;

  return (
    <GuestHeader pathname={pathname} showLogin={!isAuthPath(pathname)} />
  );
}
