"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Building2, LayoutDashboard, LogOut } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function AdminNav() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const overviewActive = isActive(pathname, "/admin/dashboard", true);
  const librariesActive = isActive(
    pathname,
    "/admin/dashboard/libraries",
    false
  );
  const searchActive = isActive(pathname, "/search", true);

  const desktopLink = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
      active
        ? "bg-bs-teal-soft text-bs-teal font-medium"
        : "text-bs-muted hover:text-bs-ink hover:bg-bs-paper"
    }`;

  const mobileLink = (active: boolean) =>
    `flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] ${
      active ? "text-bs-teal" : "text-bs-muted"
    }`;

  return (
    <>
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-bs-line bg-bs-surface/80 backdrop-blur-sm">
        <div className="px-5 pt-6 pb-5 border-b border-bs-line">
          <p
            className="text-lg text-bs-ink leading-tight"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Operations
          </p>
          <p className="text-xs text-bs-muted mt-1">BookScavenger admin</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <Link href="/admin/dashboard" className={desktopLink(overviewActive)}>
            <LayoutDashboard size={18} strokeWidth={1.75} />
            Overview
          </Link>
          <Link
            href="/admin/dashboard/libraries"
            className={desktopLink(librariesActive)}
          >
            <Building2 size={18} strokeWidth={1.75} />
            Libraries
          </Link>
          <Link href="/search" className={desktopLink(searchActive)}>
            <BookOpen size={18} strokeWidth={1.75} />
            Find books
          </Link>
        </nav>

        <div className="p-3 border-t border-bs-line">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-bs-muted hover:text-bs-danger hover:bg-bs-paper transition"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-bs-line bg-bs-surface/95 backdrop-blur flex">
        <Link href="/admin/dashboard" className={mobileLink(overviewActive)}>
          <LayoutDashboard size={18} strokeWidth={1.75} />
          Overview
        </Link>
        <Link
          href="/admin/dashboard/libraries"
          className={mobileLink(librariesActive)}
        >
          <Building2 size={18} strokeWidth={1.75} />
          Libraries
        </Link>
        <Link href="/search" className={mobileLink(searchActive)}>
          <BookOpen size={18} strokeWidth={1.75} />
          Search
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] text-bs-muted"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Sign out
        </button>
      </nav>
    </>
  );
}
