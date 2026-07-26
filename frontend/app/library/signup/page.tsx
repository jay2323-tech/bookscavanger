"use client";

import RoleSelector from "@/app/components/RoleSelector";
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

  const signupCustomerEmail = async () => {
    if (form.password.length < 8)
      throw new Error("Password must be at least 8 characters");

    if (form.password !== form.confirmPassword)
      throw new Error("Passwords do not match");

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
        },
      },
    });

    if (error) throw error;

    if (data.session?.access_token) {
      await routeAfterSession(data.session.access_token);
      return;
    }

    setInfo("Check your email to confirm your account, then log in.");
    router.replace("/library/login");
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

  const handleSignup = async () => {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (role === "customer") {
        await signupCustomerEmail();
      } else {
        await signupWithGoogle("librarian");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReaderGoogle = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await signupWithGoogle("reader");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  };

  return (
    <div className="bs-paper-grid min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-bs-surface p-8 rounded-xl border border-bs-line shadow-sm bs-fade-in">
        <h1
          className="text-2xl font-semibold text-bs-ink mb-4 text-center"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Create an account
        </h1>

        <RoleSelector role={role} setRole={setRole} />

        {role === "customer" && (
          <>
            <button
              type="button"
              onClick={handleReaderGoogle}
              disabled={loading}
              className="w-full mb-4 border border-bs-line bg-bs-paper text-bs-ink py-3 rounded-lg font-semibold hover:border-bs-teal"
            >
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="text-center text-bs-muted text-sm mb-4">OR</div>

            <input
              placeholder="Full Name"
              className="w-full mb-3 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line text-bs-ink"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full mb-3 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line text-bs-ink"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full mb-3 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line text-bs-ink"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full mb-4 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line text-bs-ink"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
          </>
        )}

        {role === "librarian" && (
          <p className="text-sm text-bs-muted mb-4 text-center">
            Librarians continue with Google, then complete library onboarding.
          </p>
        )}

        {error && <p className="text-bs-danger text-sm mb-3">{error}</p>}
        {info && <p className="text-bs-teal text-sm mb-3">{info}</p>}

        {(role === "librarian" || role === "customer") && (
          <button
            type="button"
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold hover:brightness-95"
          >
            {loading
              ? "Processing..."
              : role === "librarian"
                ? "Continue with Google"
                : "Sign up with email"}
          </button>
        )}

        <p className="text-center text-sm text-bs-muted mt-6">
          Already have an account?{" "}
          <Link href="/library/login" className="text-bs-teal font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
