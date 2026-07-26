"use client";

import { supabase } from "@/app/lib/supabaseClient";
import { resolveAuthDestination } from "@/app/library/resolveAuthDestination";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

async function fetchStatus(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding/status`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to load application status");
  return res.json() as Promise<{
    role: string;
    library: {
      id: string | number;
      name: string;
      email: string | null;
      latitude: number | null;
      longitude: number | null;
      opens_at: string | null;
      closes_at: string | null;
      approved: boolean;
      rejected: boolean;
    } | null;
  }>;
}

export default function LibrarianOnboardingPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingId, setExistingId] = useState<string | number | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    latitude: "",
    longitude: "",
    opens_at: "09:00",
    closes_at: "20:00",
  });

  useEffect(() => {
    let cancelled = false;
    const editMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("edit") === "1";

    const checkAuth = async () => {
      for (let i = 0; i < 15; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          try {
            const status = await fetchStatus(session.access_token);
            if (cancelled) return;

            const library = status.library;
            const role = status.role || "customer";

            if (library) {
              const dest = resolveAuthDestination({
                role,
                library: {
                  approved: library.approved,
                  rejected: library.rejected,
                },
              });

              if (
                dest === "/library/pending" &&
                !library.approved &&
                !library.rejected
              ) {
                if (!editMode) {
                  router.replace("/library/pending");
                  return;
                }
                setExistingId(library.id);
                setForm({
                  name: library.name || "",
                  email: library.email || "",
                  latitude:
                    library.latitude != null ? String(library.latitude) : "",
                  longitude:
                    library.longitude != null ? String(library.longitude) : "",
                  opens_at: library.opens_at || "09:00",
                  closes_at: library.closes_at || "20:00",
                });
                setReady(true);
                return;
              }

              if (dest !== "/library/onboarding") {
                router.replace(dest);
                return;
              }
            }

            setForm((f) => ({
              ...f,
              email: f.email || session.user.email || "",
            }));
            setReady(true);
            return;
          } catch {
            /* retry */
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!cancelled) {
        router.replace("/library/login");
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            latitude: form.latitude,
            longitude: form.longitude,
            opens_at: form.opens_at,
            closes_at: form.closes_at,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Onboarding failed");
      }

      window.location.assign("/library/pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-bs-paper text-bs-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20 text-bs-muted bg-bs-paper px-4 bs-field min-h-[calc(100vh-4.5rem)]">
      <div className="w-full max-w-md bg-bs-surface p-8 rounded-xl text-bs-ink border border-bs-line">
        <h1
          className="text-2xl font-semibold text-bs-ink mb-2 text-center"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Library onboarding
        </h1>
        <p className="text-sm text-bs-muted text-center mb-6">
          {existingId
            ? "Update your application details and resubmit."
            : "Tell us about your library. An admin will review your application."}
        </p>

        <input
          placeholder="Library Name"
          className="w-full mb-4 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Contact Email (optional)"
          className="w-full mb-4 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Latitude"
          className="w-full mb-4 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line"
          value={form.latitude}
          onChange={(e) => setForm({ ...form, latitude: e.target.value })}
        />

        <input
          placeholder="Longitude"
          className="w-full mb-4 px-4 py-3 rounded-lg bg-bs-paper border border-bs-line"
          value={form.longitude}
          onChange={(e) => setForm({ ...form, longitude: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3 mb-2">
          <input
            type="time"
            className="w-full px-4 py-3 rounded-lg bg-bs-paper border border-bs-line"
            value={form.opens_at}
            onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
          />
          <input
            type="time"
            className="w-full px-4 py-3 rounded-lg bg-bs-paper border border-bs-line"
            value={form.closes_at}
            onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
          />
        </div>
        <p className="text-xs text-bs-muted mb-4">Opening hours (local time)</p>

        {error && <p className="text-bs-danger text-sm mb-3">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold"
        >
          {loading
            ? "Submitting..."
            : existingId
              ? "Update application"
              : "Submit for approval"}
        </button>
      </div>
    </div>
  );
}
