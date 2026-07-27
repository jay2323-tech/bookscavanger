"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { fetchOnboardingStatus } from "@/app/library/fetchOnboardingStatus";
import {
  applySafeNext,
  clearOAuthIntent,
  getOAuthIntent,
  getOAuthNext,
  resolveAuthDestination,
} from "@/app/library/resolveAuthDestination";

async function establishSession() {
  if (typeof window === "undefined") return { session: null, error: null };

  // Prefer session already detected from URL (detectSessionInUrl)
  {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { session: data.session, error: null };
    }
  }

  const hash = window.location.hash?.replace(/^#/, "") || "";
  if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token") || "";
    if (access_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      // Strip tokens from the address bar
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
      if (error) return { session: null, error: error.message };
      if (data.session) return { session: data.session, error: null };
    }
  }

  // PKCE code flow fallback
  const search = new URLSearchParams(window.location.search);
  const code = search.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { session: null, error: error.message };
    if (data.session) return { session: data.session, error: null };
  }

  const { data } = await supabase.auth.getSession();
  return { session: data.session, error: null };
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const oauthError =
      params.get("error_description") || params.get("error");

    if (oauthError) {
      const decoded = decodeURIComponent(oauthError.replace(/\+/g, " "));
      setFailed(true);
      setMessage(
        decoded.includes("Database error saving new user")
          ? "Signup failed: database trigger error. Run database/migrations/007_fix_handle_new_user.sql in Supabase, then try Google again."
          : `Sign-in failed: ${decoded}`
      );
      clearOAuthIntent();
      return;
    }

    const next = params.get("next") || getOAuthNext();

    const routeUser = async () => {
      let session = null as Awaited<
        ReturnType<typeof establishSession>
      >["session"];
      let lastError: string | null = null;

      for (let i = 0; i < 20; i++) {
        const result = await establishSession();
        session = result.session;
        lastError = result.error;
        if (session?.access_token && session.user) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (cancelled) return;

      if (!session?.access_token || !session.user) {
        setFailed(true);
        setMessage(
          lastError
            ? `Could not establish session: ${lastError}`
            : "Could not establish session. Try signing in again."
        );
        clearOAuthIntent();
        return;
      }

      // Remove hash if still present
      if (window.location.hash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }

      const intent = getOAuthIntent();
      setMessage("Finishing setup…");

      try {
        let status = null as Awaited<
          ReturnType<typeof fetchOnboardingStatus>
        > | null;

        for (let p = 0; p < 8; p++) {
          try {
            status = await fetchOnboardingStatus(session.access_token);
            if (status?.role) break;
          } catch (e) {
            console.warn("onboarding status attempt failed", e);
          }
          await new Promise((r) => setTimeout(r, 300));
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

      if (cancelled) return;
      if (intent === "librarian") {
        clearOAuthIntent();
        window.location.assign("/library/onboarding");
        return;
      }
      if (intent === "admin") {
        clearOAuthIntent();
        window.location.assign("/admin/dashboard");
        return;
      }

      clearOAuthIntent();
      window.location.assign("/search");
    };

    routeUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bs-paper text-bs-ink px-6 text-center">
      <p className="max-w-md text-sm sm:text-base">{message}</p>
      {failed && (
        <Link
          href="/library/login"
          className="text-sm font-semibold text-bs-teal hover:underline"
        >
          Back to login
        </Link>
      )}
    </div>
  );
}
