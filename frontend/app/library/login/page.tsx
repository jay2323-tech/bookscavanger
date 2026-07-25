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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0F172A]">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8 text-white">

        <h1 className="text-2xl font-bold text-[#D4AF37] mb-6 text-center">
          Login
        </h1>

        {/* GOOGLE LOGIN */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-4 bg-white text-black py-3 rounded-lg font-semibold"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="text-center text-gray-500 text-sm mb-4">OR</div>

        {/* EMAIL LOGIN */}
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-4 py-3 rounded bg-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 px-4 py-3 rounded bg-gray-800"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handlePasswordLogin}
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black py-3 rounded-lg font-semibold"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don’t have an account?{" "}
          <Link href="/library/signup" className="text-[#D4AF37]">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
}
