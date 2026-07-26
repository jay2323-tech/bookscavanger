"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { fetchOnboardingStatus } from "@/app/library/fetchOnboardingStatus";
import {
  applySafeNext,
  clearOAuthIntent,
  getOAuthIntent,
  resolveAuthDestination,
} from "@/app/library/resolveAuthDestination";

async function ensureSessionFromUrl() {
  // Implicit-flow tokens often arrive in the hash; set them explicitly if needed.
  if (typeof window === "undefined") return null;

  const hash = window.location.hash?.replace(/^#/, "") || "";
  if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || "",
      });
      if (!error && data.session) {
        // Clean hash so refreshes don't re-process
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
        return data.session;
      }
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;

    const routeUser = async () => {
      let session = await ensureSessionFromUrl();

      for (let i = 0; i < 25 && !session?.access_token; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const again = await supabase.auth.getSession();
        session = again.data.session;
      }

      if (cancelled) return;

      if (!session?.access_token || !session.user) {
        setMessage("Could not establish session. Try again.");
        clearOAuthIntent();
        router.replace("/library/login");
        return;
      }

      const intent = getOAuthIntent();

      // Prefer backend status (bypasses RLS); fall back to intent-only routing
      try {
        let status = null as Awaited<
          ReturnType<typeof fetchOnboardingStatus>
        > | null;

        for (let p = 0; p < 6; p++) {
          try {
            status = await fetchOnboardingStatus(session.access_token);
            if (status?.role) break;
          } catch (e) {
            console.warn("onboarding status attempt failed", e);
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        if (cancelled) return;

        const role = status?.role || "customer";
        const library = status?.library
          ? {
              approved: status.library.approved,
              rejected: status.library.rejected,
            }
          : null;

        let dest = resolveAuthDestination({
          role,
          library,
          oauthIntent: intent,
        });

        // Librarian signup must never die on /login or /search when intent is set
        if (
          intent === "librarian" &&
          (dest === "/search" || dest === "/library/login")
        ) {
          dest = "/library/onboarding";
        }

        dest = applySafeNext(dest, next);
        clearOAuthIntent();
        setMessage("Redirecting…");
        window.location.assign(dest);
        return;
      } catch (err) {
        console.error("oauth routing error", err);
      }

      // Last resort: route by intent alone
      if (cancelled) return;
      if (intent === "librarian") {
        clearOAuthIntent();
        window.location.assign("/library/onboarding");
        return;
      }
      if (intent === "admin") {
        clearOAuthIntent();
        window.location.assign("/admin/oauth-callback");
        return;
      }

      clearOAuthIntent();
      setMessage("Signed in, but routing failed. Opening search…");
      window.location.assign("/search");
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
