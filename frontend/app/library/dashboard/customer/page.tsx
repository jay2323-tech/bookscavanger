"use client";

import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CustomerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/library/login");
        return;
      }

      setName(user.user_metadata?.name || user.email || "Reader");
    };

    init();
  }, [router]);

  return (
    <div className="p-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Welcome{name ? `, ${name}` : ""}</h1>
      <p className="text-gray-400 mb-8">
        Search BookScavenger for books available in libraries near you.
      </p>
      <Link
        href="/search"
        className="inline-flex bg-[#D4AF37] text-black px-6 py-3 rounded-lg font-semibold hover:opacity-90"
      >
        Find a book
      </Link>
    </div>
  );
}
