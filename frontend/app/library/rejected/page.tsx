"use client";

import AuthShell from "@/app/components/AuthShell";
import Button from "@/app/components/ui/Button";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RejectedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding/status`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.library?.reject_reason) {
          setReason(String(data.library.reject_reason));
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

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
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not re-apply");
      router.replace("/library/onboarding?edit=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not re-apply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Librarian"
      title="Application not approved"
      subtitle="You can update your details and re-apply, or return home."
    >
      {reason && (
        <div className="mb-5 rounded-lg border border-bs-danger/25 bg-bs-danger/5 px-3 py-3 text-sm text-bs-ink">
          <p className="text-xs uppercase tracking-[0.1em] text-bs-muted mb-1">
            Reason from admin
          </p>
          <p>{reason}</p>
        </div>
      )}
      {error && (
        <p className="text-bs-danger text-sm mb-4 text-center">{error}</p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          className="w-full py-3"
          disabled={loading}
          onClick={reapply}
        >
          {loading ? "Preparing…" : "Update & re-apply"}
        </Button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm border border-bs-line text-bs-muted hover:text-bs-teal"
        >
          Back to BookScavenger
        </Link>
      </div>
    </AuthShell>
  );
}
