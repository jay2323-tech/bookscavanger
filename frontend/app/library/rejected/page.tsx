"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function RejectedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reapply = async () => {
    setError("");
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/library/login");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding/reapply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not re-apply");
      }

      router.replace("/library/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not re-apply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bs-paper text-bs-ink px-4">
      <h1
        className="text-3xl font-semibold text-bs-danger mb-4 text-center"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Application rejected
      </h1>
      <p className="text-bs-muted text-center max-w-md mb-8">
        Your library application was not approved. You can update your details
        and re-apply, or return home.
      </p>
      {error && (
        <p className="text-bs-danger text-sm mb-4 text-center">{error}</p>
      )}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={reapply}
          disabled={loading}
          className="bg-bs-teal text-white px-6 py-3 rounded-lg font-semibold hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Preparing…" : "Re-apply"}
        </button>
        <Link
          href="/"
          className="bg-bs-gold text-bs-gold-ink px-6 py-3 rounded-lg font-semibold hover:opacity-90"
        >
          Back to BookScavenger
        </Link>
      </div>
    </div>
  );
}
