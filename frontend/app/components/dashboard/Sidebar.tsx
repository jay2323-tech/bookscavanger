"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { authFetch } from "@/app/library/authFetch";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  Search,
  Settings,
  User,
} from "lucide-react";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

type NavLink = {
  href: string;
  label: string;
  icon: typeof User;
  badge?: number;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [pendingHolds, setPendingHolds] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const onDashboard = pathname.startsWith("/library/dashboard");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const r = profile?.role ?? null;
      setRole(r);

      if (r === "librarian") {
        try {
          const res = await authFetch(`${backend}/api/library/dashboard`);
          if (res.ok) {
            const d = await res.json();
            setPendingHolds(Number(d.pendingHolds) || 0);
          }
        } catch {
          /* ignore */
        }
      }
    });
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const readerLinks: NavLink[] = [
    {
      href: "/library/dashboard/customer",
      label: "My shelf",
      icon: User,
    },
    // Find books lives on /search — not inside the dashboard menu
    ...(!onDashboard
      ? [
          {
            href: "/search",
            label: "Find books",
            icon: Search,
          } satisfies NavLink,
        ]
      : []),
    {
      href: "/plan",
      label: "Book run",
      icon: Map,
    },
    {
      href: "/library/dashboard/account",
      label: "Settings",
      icon: Settings,
    },
  ];

  const links: NavLink[] =
    role === "librarian"
      ? [
          {
            href: "/library/dashboard/overview",
            label: "Overview",
            icon: LayoutDashboard,
          },
          {
            href: "/library/dashboard/holds",
            label: "Holds",
            icon: ClipboardList,
            badge: pendingHolds,
          },
          {
            href: "/library/dashboard/catalog",
            label: "Catalog",
            icon: BookOpen,
          },
          {
            href: "/library/dashboard/settings",
            label: "Settings",
            icon: Settings,
          },
        ]
      : role === "admin"
        ? [{ href: "/admin/dashboard", label: "Admin", icon: LayoutDashboard }]
        : readerLinks;

  const logout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const current =
    links.find((l) => active(l.href)) ||
    (pathname.startsWith("/search")
      ? { href: "/search", label: "Find books", icon: Search }
      : links[0]);

  const homeHref =
    role === "librarian"
      ? "/library/dashboard/overview"
      : role === "admin"
        ? "/admin/dashboard"
        : "/library/dashboard/customer";

  const brand =
    role === "librarian"
      ? "Library ops"
      : role === "admin"
        ? "Admin"
        : "Reader";

  return (
    <header className="sticky top-0 z-50 border-b border-bs-line/80 bg-bs-surface/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-3">
        <Link href={homeHref} className="min-w-0 group">
          <p
            className="text-lg sm:text-xl text-bs-ink tracking-tight leading-none"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Book<span className="text-bs-gold">Scavenger</span>
          </p>
          <p className="text-[11px] text-bs-muted mt-1 tracking-wide">
            {brand}
          </p>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="inline-flex items-center gap-2 rounded-full border border-bs-line bg-bs-surface px-3.5 sm:px-4 py-2 text-sm text-bs-ink shadow-sm hover:border-bs-teal/35 hover:bg-bs-paper transition"
          >
            {current && (
              <current.icon
                size={16}
                strokeWidth={1.75}
                className="text-bs-teal shrink-0"
              />
            )}
            <span className="font-medium max-w-[9rem] truncate">
              {current?.label || "Menu"}
            </span>
            {"badge" in (current || {}) && (current as NavLink).badge ? (
              <span className="text-[10px] font-semibold tabular-nums bg-bs-gold/20 text-bs-gold-ink px-1.5 py-0.5 rounded-full">
                {(current as NavLink).badge}
              </span>
            ) : null}
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              className={`text-bs-muted shrink-0 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            role="menu"
            className={`absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-bs-line bg-bs-surface shadow-lg shadow-bs-ink/5 overflow-hidden transition duration-200 ease-out ${
              open
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
            }`}
          >
            <div className="px-3.5 pt-3 pb-2 border-b border-bs-line/70">
              <p className="text-[11px] uppercase tracking-[0.12em] text-bs-muted">
                Navigate
              </p>
            </div>
            <nav className="p-1.5">
              {links.map((l) => {
                const isOn = active(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isOn
                        ? "bg-bs-teal-soft text-bs-teal font-medium"
                        : "text-bs-ink hover:bg-bs-paper"
                    }`}
                  >
                    <l.icon size={17} strokeWidth={1.75} className="shrink-0" />
                    <span className="flex-1">{l.label}</span>
                    {l.badge ? (
                      <span className="text-[10px] font-semibold tabular-nums bg-bs-gold/20 text-bs-gold-ink px-1.5 py-0.5 rounded-full">
                        {l.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="p-1.5 border-t border-bs-line/70">
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-bs-danger hover:bg-bs-danger/5 transition"
              >
                <LogOut size={17} strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
