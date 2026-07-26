"use client";

import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchOnboardingStatus } from "@/app/library/fetchOnboardingStatus";
import {
  applySafeNext,
  clearOAuthIntent,
  getOAuthIntent,
  resolveAuthDestination,
  setOAuthIntent,
} from "@/app/library/resolveAuthDestination";

function readNextParam() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

export default function LibraryLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asLibrarian, setAsLibrarian] = useState(false);

  const handlePasswordLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginErr) throw loginErr;
      if (!data.session?.access_token || !data.user) {
        throw new Error("Authentication failed.");
      }

      await handlePostLogin(data.session.access_token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      setOAuthIntent(asLibrarian ? "librarian" : "reader");
      const callback = new URL(
        "/library/oauth-callback",
        window.location.origin
      );
      const next = readNextParam();
      if (next) callback.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setLoading(false);
    }
  };

  const handlePostLogin = async (accessToken: string) => {
    const status = await fetchOnboardingStatus(accessToken);
    const intent = asLibrarian ? "librarian" : getOAuthIntent();
    let dest = resolveAuthDestination({
      role: status.role,
      library: status.library
        ? {
            approved: status.library.approved,
            rejected: status.library.rejected,
          }
        : null,
      oauthIntent: intent,
    });
    dest = applySafeNext(dest, readNextParam());
    clearOAuthIntent();
    router.replace(dest);
  };

  return (
    <div className="bs-paper-grid min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-bs-surface border border-bs-line rounded-xl p-8 shadow-sm bs-fade-in">
        <h1
          className="text-2xl font-semibold text-bs-ink mb-6 text-center"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Login
        </h1>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-3 border border-bs-line bg-bs-paper text-bs-ink py-3 rounded-lg font-semibold hover:border-bs-teal"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        <label className="flex items-center gap-2 mb-4 text-sm text-bs-muted cursor-pointer">
          <input
            type="checkbox"
            checked={asLibrarian}
            onChange={(e) => setAsLibrarian(e.target.checked)}
            className="rounded border-bs-line"
          />
          Signing in as a library?
        </label>

        <div className="text-center text-bs-muted text-sm mb-4">OR</div>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line text-bs-ink"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line text-bs-ink"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-bs-danger text-sm mb-3">{error}</p>}

        <button
          type="button"
          onClick={handlePasswordLogin}
          disabled={loading}
          className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold hover:brightness-95"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-bs-muted mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/library/signup" className="text-bs-teal font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
