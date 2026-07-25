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
  const [open, setOpen] = useState(false);

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

  const handleDashboard = () => {
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else if (role === "librarian") {
      router.push("/library/dashboard/librarian");
    } else {
      router.push("/library/dashboard/customer");
    }
    setOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setOpen(false);
    router.push("/");
  };

  const linkClass = (href: string) =>
    `text-sm transition ${
      pathname === href ? "text-[#D4AF37]" : "text-gray-300 hover:text-white"
    }`;

  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-gray-800 bg-[#0F172A] text-white">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-bold text-[#D4AF37] tracking-tight">
          Lectère
        </Link>
        <div className="hidden sm:flex items-center gap-5">
          <Link href="/search" className={linkClass("/search")}>
            Find books
          </Link>
          <Link href="/about" className={linkClass("/about")}>
            About
          </Link>
          <Link href="/for-libraries" className={linkClass("/for-libraries")}>
            For libraries
          </Link>
        </div>
      </div>

      {!user ? (
        <Link
          href="/library/login"
          className="text-sm font-medium text-[#D4AF37] hover:opacity-90"
        >
          Login / Signup
        </Link>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-full bg-[#D4AF37] text-black font-bold flex items-center justify-center"
          >
            {(user.user_metadata?.name || user.email)?.[0]?.toUpperCase() || "U"}
          </button>

          {open && (
            <div className="absolute right-0 mt-3 w-44 bg-gray-900 border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={handleDashboard}
                className="w-full text-left px-4 py-3 hover:bg-gray-800 text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 hover:bg-gray-800 text-sm text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
