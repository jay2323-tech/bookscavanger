"use client";

import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LibraryLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // 🔐 EMAIL/PASSWORD LOGIN
  // =========================================================
  const handlePasswordLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const { data, error: loginErr } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginErr) throw loginErr;
      if (!data.user) throw new Error("Authentication failed.");

      await handlePostLogin(data.user);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 🌍 GOOGLE LOGIN
  // =========================================================
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      sessionStorage.setItem("oauth_intent", "library");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/library/oauth-callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google login failed");
      setLoading(false);
    }
  };

  // =========================================================
  // 🎯 ROLE + APPROVAL CHECK (DATABASE IS SOURCE OF TRUTH)
  // =========================================================
  const handlePostLogin = async (user: any) => {
    // 1️⃣ Get role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found.");
    }

    const role = profile.role;

    // =========================
    // 👑 ADMIN FLOW
    // =========================
    if (role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    // =========================
    // 📚 LIBRARIAN FLOW
    // =========================
    if (role === "librarian") {
      const { data: library, error: libErr } = await supabase
        .from("libraries")
        .select("approved, rejected")
        .eq("supabase_user_id", user.id)
        .maybeSingle();

      if (libErr) {
        throw new Error("Failed to fetch library.");
      }

      // 🔥 No library row → onboarding not completed
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

      // ✅ Approved librarian
      router.replace("/library/dashboard/librarian");
      return;
    }

    // =========================
    // 👤 CUSTOMER FLOW
    // =========================
    if (role === "customer") {
      // Customer who applied as librarian (pending approval)
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
      }

      router.replace("/search");
      return;
    }

    throw new Error("User role not recognized.");
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
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-4 border border-bs-line bg-bs-paper text-bs-ink py-3 rounded-lg font-semibold hover:border-bs-teal"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

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
          onClick={handlePasswordLogin}
          disabled={loading}
          className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold hover:brightness-95"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-bs-muted mt-6">
          Don’t have an account?{" "}
          <Link href="/library/signup" className="text-bs-teal font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
