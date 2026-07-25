"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    const routeUser = async () => {
      // Wait briefly for hash session to be parsed
      for (let i = 0; i < 20; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const user = session.user;

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (cancelled) return;

          if (profileError || !profile) {
            router.replace("/library/login");
            return;
          }

          const role = profile.role;

          if (role === "admin") {
            router.replace("/admin/dashboard");
            return;
          }

          if (role === "librarian") {
            const { data: library } = await supabase
              .from("libraries")
              .select("approved, rejected")
              .eq("supabase_user_id", user.id)
              .maybeSingle();

            if (!library) {
              router.replace("/library/onboarding");
              return;
            }
            if (library.rejected) {
              await supabase.auth.signOut();
              router.replace("/library/rejected");
              return;
            }
            if (!library.approved) {
              router.replace("/library/pending");
              return;
            }
            router.replace("/library/dashboard/librarian");
            return;
          }

          if (role === "customer") {
            const { data: library } = await supabase
              .from("libraries")
              .select("approved, rejected")
              .eq("supabase_user_id", user.id)
              .maybeSingle();

            if (library) {
              if (library.rejected) {
                await supabase.auth.signOut();
                router.replace("/library/rejected");
                return;
              }
              if (!library.approved) {
                router.replace("/library/pending");
                return;
              }
              router.replace("/library/dashboard/librarian");
              return;
            }

            router.replace("/search");
            return;
          }

          router.replace("/");
          return;
        }

        await new Promise((r) => setTimeout(r, 150));
      }

      if (!cancelled) {
        setMessage("Login timed out. Try again.");
        router.replace("/library/login");
      }
    };

    routeUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bs-paper text-bs-ink">
      <p>{message}</p>
    </div>
  );
}
