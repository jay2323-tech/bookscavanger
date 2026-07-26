"use client";

import AuthShell from "@/app/components/AuthShell";
import RoleSelector from "@/app/components/RoleSelector";
import Button from "@/app/components/ui/Button";
import TextField from "@/app/components/ui/TextField";
import { supabase } from "@/app/lib/supabaseClient";
import { fetchOnboardingStatus } from "@/app/library/fetchOnboardingStatus";
import {
  clearOAuthIntent,
  resolveAuthDestination,
  setOAuthIntent,
} from "@/app/library/resolveAuthDestination";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "customer" | "librarian";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const routeAfterSession = async (accessToken: string) => {
    const status = await fetchOnboardingStatus(accessToken);
    const dest = resolveAuthDestination({
      role: status.role,
      library: status.library
        ? {
            approved: status.library.approved,
            rejected: status.library.rejected,
          }
        : null,
      oauthIntent: "reader",
    });
    clearOAuthIntent();
    router.replace(dest);
  };

  const signupWithGoogle = async (intent: "reader" | "librarian") => {
    setOAuthIntent(intent);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/library/oauth-callback`,
      },
    });
    if (error) throw error;
  };

  const signupCustomerEmail = async () => {
    if (form.password.length < 8)
      throw new Error("Password must be at least 8 characters");
    if (form.password !== form.confirmPassword)
      throw new Error("Passwords do not match");

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    });
    if (error) throw error;

    if (data.session?.access_token) {
      await routeAfterSession(data.session.access_token);
      return;
    }
    setInfo("Check your email to confirm your account, then sign in.");
  };

  const handlePrimary = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (role === "librarian") {
        await signupWithGoogle("librarian");
      } else {
        await signupCustomerEmail();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReaderGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signupWithGoogle("reader");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      subtitle={
        role === "librarian"
          ? "Continue with Google, then tell us about your library."
          : "Find books nearby, place holds, and get alerts."
      }
    >
      <RoleSelector role={role} setRole={setRole} />

      {role === "customer" && (
        <>
          <Button
            type="button"
            variant="secondary"
            className="w-full py-3 mb-5"
            disabled={loading}
            onClick={handleReaderGoogle}
          >
            {loading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-bs-line" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-bs-surface px-3 text-bs-muted">or email</span>
            </div>
          </div>

          <div className="space-y-3">
            <TextField
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ada Lovelace"
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
            <TextField
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              placeholder="Repeat password"
            />
          </div>
        </>
      )}

      {error && <p className="text-bs-danger text-sm mt-3">{error}</p>}
      {info && <p className="text-bs-teal text-sm mt-3">{info}</p>}

      <Button
        type="button"
        variant="primary"
        className="w-full mt-5 py-3"
        disabled={loading}
        onClick={handlePrimary}
      >
        {loading
          ? "Processing…"
          : role === "librarian"
            ? "Continue with Google"
            : "Create account"}
      </Button>

      <p className="text-center text-sm text-bs-muted mt-6">
        Already have an account?{" "}
        <Link href="/library/login" className="text-bs-teal font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
