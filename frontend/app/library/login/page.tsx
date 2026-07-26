"use client";

import AuthShell from "@/app/components/AuthShell";
import Button from "@/app/components/ui/Button";
import TextField from "@/app/components/ui/TextField";
import { supabase } from "@/app/lib/supabaseClient";
import { fetchOnboardingStatus } from "@/app/library/fetchOnboardingStatus";
import {
  applySafeNext,
  clearOAuthIntent,
  getOAuthIntent,
  resolveAuthDestination,
  setOAuthIntent,
} from "@/app/library/resolveAuthDestination";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const handlePasswordLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginErr) throw loginErr;
      if (!data.session?.access_token) throw new Error("Authentication failed.");
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
        options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to request holds, set alerts, or manage your library."
    >
      <Button
        type="button"
        variant="secondary"
        className="w-full py-3"
        disabled={loading}
        onClick={handleGoogleLogin}
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <label className="mt-3 flex items-center gap-2 text-sm text-bs-muted cursor-pointer">
        <input
          type="checkbox"
          checked={asLibrarian}
          onChange={(e) => setAsLibrarian(e.target.checked)}
          className="rounded border-bs-line text-bs-teal focus:ring-bs-teal/40"
        />
        Signing in as a library?
      </label>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-bs-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-bs-surface px-3 text-bs-muted">or email</span>
        </div>
      </div>

      <div className="space-y-3">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-bs-danger text-sm mt-3">{error}</p>}

      <Button
        type="button"
        variant="primary"
        className="w-full mt-5 py-3"
        disabled={loading}
        onClick={handlePasswordLogin}
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-bs-muted mt-6">
        No account?{" "}
        <Link href="/library/signup" className="text-bs-teal font-medium hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
