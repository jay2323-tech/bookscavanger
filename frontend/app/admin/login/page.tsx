"use client";

import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    sessionStorage.setItem("oauth_intent", "admin");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/oauth-callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="bs-paper-grid min-h-[calc(100vh-4.5rem)] flex items-center justify-center px-4">
      <div className="bg-bs-surface border border-bs-line text-bs-ink p-8 rounded-xl w-full max-w-sm shadow-sm">
        <h2
          className="text-2xl font-semibold mb-6 text-center"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Admin login
        </h2>

        {error && (
          <p className="text-bs-danger text-sm mb-3 text-center">{error}</p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold hover:brightness-95"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full mt-3 text-sm text-bs-muted hover:text-bs-teal"
        >
          Back to home
        </button>
      </div>
    </main>
  );
}
