"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { BookOpen, LayoutDashboard, User } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      setRole(profile?.role ?? null);
    });
  }, []);

  const links =
    role === "librarian"
      ? [
          { href: "/library/dashboard/librarian", label: "Librarian", icon: BookOpen },
        ]
      : role === "admin"
        ? [{ href: "/admin/dashboard", label: "Admin", icon: LayoutDashboard }]
        : [
            {
              href: "/library/dashboard/customer",
              label: "My shelf",
              icon: User,
            },
          ];

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
      pathname === path
        ? "bg-bs-teal-soft text-bs-teal font-medium"
        : "text-bs-muted hover:text-bs-ink hover:bg-bs-paper"
    }`;

  return (
    <>
      <aside className="w-56 border-r border-bs-line bg-bs-surface p-5 hidden md:block shrink-0">
        <p
          className="text-sm font-semibold text-bs-ink mb-6"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Dashboard
        </p>
        <nav className="space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              <l.icon size={18} />
              {l.label}
            </Link>
          ))}
          <Link href="/search" className={linkClass("/search")}>
            <BookOpen size={18} />
            Find books
          </Link>
        </nav>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-bs-line bg-bs-surface/95 backdrop-blur flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] ${
              pathname === l.href ? "text-bs-teal" : "text-bs-muted"
            }`}
          >
            <l.icon size={18} />
            {l.label}
          </Link>
        ))}
        <Link
          href="/search"
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] ${
            pathname === "/search" ? "text-bs-teal" : "text-bs-muted"
          }`}
        >
          <BookOpen size={18} />
          Search
        </Link>
      </nav>
    </>
  );
}
