"use client";

import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const nextUser = data.user;
      setUser(nextUser);

      if (nextUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", nextUser.id)
          .single();
        setRole(profile?.role ?? null);
      } else {
        setRole(null);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => setRole(profile?.role ?? null));
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [pathname]);

  const dashboardHref =
    role === "admin"
      ? "/admin/dashboard"
      : role === "librarian"
        ? "/library/dashboard/librarian"
        : "/library/dashboard/customer";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setUserOpen(false);
    setMenuOpen(false);
    router.push("/");
  };

  const links = [
    { href: "/search", label: "Find books" },
    { href: "/plan", label: "Book run" },
    { href: "/about", label: "About" },
    { href: "/for-libraries", label: "For libraries" },
  ];

  const linkClass = (href: string) =>
    `text-sm transition border-b-2 pb-0.5 ${
      pathname === href || pathname.startsWith(href + "/")
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
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <Link
              href="/library/login"
              className="hidden sm:inline-flex text-sm font-semibold bg-bs-gold text-bs-gold-ink px-4 py-2 rounded-lg hover:brightness-95"
            >
              Login
            </Link>
          ) : (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-bs-teal text-white font-bold flex items-center justify-center"
                aria-label="Account menu"
              >
                {(user.user_metadata?.name || user.email)?.[0]?.toUpperCase() ||
                  "U"}
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-bs-surface border border-bs-line rounded-lg shadow-lg overflow-hidden z-50">
                  <Link
                    href={dashboardHref}
                    className="block px-4 py-3 text-sm hover:bg-bs-paper"
                    onClick={() => setUserOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-bs-danger hover:bg-bs-paper"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-bs-line bg-bs-surface p-2 text-bs-ink"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-bs-line bg-bs-surface px-4 pb-4 pt-2 bs-fade-in">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
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
            {!user ? (
              <Link
                href="/library/login"
                className="mt-2 rounded-lg bg-bs-gold text-bs-gold-ink px-3 py-3 text-sm font-semibold text-center"
              >
                Login / Signup
              </Link>
            ) : (
              <>
                <Link
                  href={dashboardHref}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-bs-ink hover:bg-bs-paper"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-bs-danger text-left hover:bg-bs-paper"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
