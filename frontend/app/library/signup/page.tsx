"use client";

import RoleSelector from "@/app/components/RoleSelector";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "customer" | "librarian";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const signupCustomer = async () => {
    if (form.password.length < 8)
      throw new Error("Password must be at least 8 characters");

    if (form.password !== form.confirmPassword)
      throw new Error("Passwords do not match");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: "customer",
          name: form.name,
        },
      },
    });

    if (error) throw error;
    router.replace("/library/login");
  };

  const signupLibrarianWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/library/onboarding`,
      },
    });

    if (error) throw error;
  };

  const handleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      if (role === "customer") {
        await signupCustomer();
      } else {
        await signupLibrarianWithGoogle();
      }
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
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

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold hover:brightness-95"
        >
          {loading
            ? "Processing..."
            : role === "librarian"
              ? "Continue with Google"
              : "Sign up"}
        </button>

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
