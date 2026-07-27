"use client";

import AuthShell from "@/app/components/AuthShell";
import Button from "@/app/components/ui/Button";
import TextField from "@/app/components/ui/TextField";
import { isFreeEmail } from "@/app/library/freeEmail";
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
      website?: string | null;
      phone?: string | null;
      latitude: number | null;
      longitude: number | null;
      opens_at: string | null;
      closes_at: string | null;
      approved: boolean;
      rejected: boolean;
      reject_reason?: string | null;
    } | null;
  }>;
}

export default function LibrarianOnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [existingId, setExistingId] = useState<string | number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    website: "",
    phone: "",
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
                  website: library.website || "",
                  phone: library.phone || "",
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
      if (!cancelled) router.replace("/library/login");
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const useMyLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError("Could not get your location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) {
      setError("Library name is required");
      return;
    }
    if (!form.website.trim()) {
      setError("Official website is required");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onboarding failed");
      window.location.assign("/library/pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <main className="bs-field min-h-[calc(100vh-4.5rem)] flex items-center justify-center text-bs-muted">
        Loading…
      </main>
    );
  }

  const freeEmail = isFreeEmail(form.email);

  return (
    <AuthShell
      eyebrow="Librarian"
      title={existingId ? "Update application" : "Library onboarding"}
      subtitle="We verify libraries before they go live. Website and phone help us confirm you’re real. After approval you’ll get an email with a join link."
      wide
    >
      <div className="space-y-4">
        <TextField
          label="Library name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Northside Community Library"
          required
        />
        <TextField
          label="Contact email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="desk@library.org"
        />
        {freeEmail && (
          <p className="text-sm text-bs-gold rounded-lg border border-bs-gold/30 bg-bs-gold/5 px-3 py-2">
            Prefer an official library email (not Gmail/Yahoo/etc.) — it makes
            approval faster. You can still submit.
          </p>
        )}
        <TextField
          label="Official website"
          type="url"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://www.yourlibrary.org"
          required
        />
        <TextField
          label="Public phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+1 555 0100"
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-bs-ink">Location</span>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="text-xs font-medium text-bs-teal hover:underline disabled:opacity-50"
            >
              {locating ? "Locating…" : "Use my location"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Latitude"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              placeholder="12.971600"
            />
            <TextField
              label="Longitude"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="77.594600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Opens"
            type="time"
            value={form.opens_at}
            onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
          />
          <TextField
            label="Closes"
            type="time"
            value={form.closes_at}
            onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-bs-danger text-sm mt-4">{error}</p>}

      <Button
        type="button"
        variant="primary"
        className="w-full mt-6 py-3"
        disabled={loading}
        onClick={handleSubmit}
      >
        {loading
          ? "Submitting…"
          : existingId
            ? "Save & resubmit"
            : "Submit for approval"}
      </Button>
    </AuthShell>
  );
}
