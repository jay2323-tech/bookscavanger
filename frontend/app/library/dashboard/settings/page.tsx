"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banner,
  PageHeader,
} from "@/app/components/dashboard/LibrarianShell";
import Button from "@/app/components/ui/Button";
import TextField from "@/app/components/ui/TextField";
import { authFetch } from "@/app/library/authFetch";
import { supabase } from "@/app/lib/supabaseClient";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

type Library = {
  id: string;
  name: string;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opens_at?: string | null;
  closes_at?: string | null;
  approved?: boolean;
  rejected?: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [library, setLibrary] = useState<Library | null>(null);
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
  const [ils, setIls] = useState({
    type: "koha_csv",
    endpoint: "",
    replace: false,
  });
  const [ilsMessage, setIlsMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/library/login");
          return;
        }

        const res = await authFetch(`${backend}/api/library/dashboard`);
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        const lib = data.library as Library;
        setLibrary(lib);
        setForm({
          name: lib.name || "",
          email: lib.email || "",
          website: lib.website || "",
          phone: lib.phone || "",
          latitude:
            lib.latitude != null && !Number.isNaN(Number(lib.latitude))
              ? String(lib.latitude)
              : "",
          longitude:
            lib.longitude != null && !Number.isNaN(Number(lib.longitude))
              ? String(lib.longitude)
              : "",
          opens_at: lib.opens_at || "09:00",
          closes_at: lib.closes_at || "20:00",
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }));
        setSuccess("Location filled from device");
      },
      () => setError("Could not read location")
    );
  };

  const saveProfile = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await authFetch(`${backend}/api/library/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          website: form.website.trim(),
          phone: form.phone.trim(),
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
          opens_at: form.opens_at,
          closes_at: form.closes_at,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setLibrary(data.library);
      setSuccess("Settings saved");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!library?.name || confirmName.trim() !== library.name.trim()) return;
    const ok = window.confirm(
      "Delete your library account permanently? This cannot be undone."
    );
    if (!ok) return;

    setError("");
    setSuccess("");
    setDeleting(true);
    try {
      const res = await authFetch(`${backend}/api/library/account`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      await supabase.auth.signOut();
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  const runIlsSync = async () => {
    setError("");
    setSuccess("");
    setIlsMessage("");
    setSyncing(true);
    try {
      const res = await authFetch(`${backend}/api/library/ils/sync`, {
        method: "POST",
        body: JSON.stringify({
          type: ils.type,
          endpoint: ils.endpoint.trim(),
          replace: ils.replace,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ILS sync failed");
      const msg = `${data.message}: ${data.count ?? 0} titles`;
      setIlsMessage(msg);
      setSuccess(msg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ILS sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse py-4">
        <div className="h-8 w-48 bg-bs-line/70 rounded mb-8" />
        <div className="h-64 bg-bs-line/20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bs-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Library profile, hours, location, and ILS sync."
      />

      {error && <Banner tone="error">{error}</Banner>}
      {success && <Banner tone="ok">{success}</Banner>}

      <section className="mb-10">
        <h2
          className="text-xl text-bs-ink mb-4"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Profile
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField
            label="Library name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Contact email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="Official website"
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
          />
          <TextField
            label="Public phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <TextField
            label="Latitude"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
          />
          <TextField
            label="Longitude"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
          />
        </div>
        <div className="mt-3">
          <Button variant="secondary" type="button" onClick={useMyLocation}>
            Use my location
          </Button>
        </div>
      </section>

      <section className="mb-10 border-t border-bs-line pt-8">
        <h2
          className="text-xl text-bs-ink mb-4"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Hours
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-md">
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
      </section>

      <div className="mb-10">
        <Button
          variant="teal"
          disabled={
            saving ||
            !form.name.trim() ||
            !form.website.trim() ||
            !form.phone.trim()
          }
          onClick={saveProfile}
        >
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <section className="mb-10 border-t border-bs-line pt-8">
        <h2
          className="text-xl text-bs-ink mb-2"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          ILS sync
        </h2>
        <p className="text-sm text-bs-muted mb-4">
          Pull inventory from a Koha CSV or SRU endpoint.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-bs-muted mb-1.5">
              Type
            </label>
            <select
              value={ils.type}
              onChange={(e) => setIls({ ...ils, type: e.target.value })}
              className="w-full rounded-lg border border-bs-line bg-bs-surface px-3 py-2.5 text-sm"
            >
              <option value="koha_csv">Koha CSV</option>
              <option value="koha_sru">Koha SRU</option>
            </select>
          </div>
          <TextField
            label="Endpoint URL"
            value={ils.endpoint}
            onChange={(e) => setIls({ ...ils, endpoint: e.target.value })}
            placeholder="https://…"
          />
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-bs-ink">
          <input
            type="checkbox"
            checked={ils.replace}
            onChange={(e) => setIls({ ...ils, replace: e.target.checked })}
            className="rounded border-bs-line"
          />
          Replace existing catalog
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={syncing || !ils.endpoint.trim()}
            onClick={runIlsSync}
          >
            {syncing ? "Syncing…" : "Run sync"}
          </Button>
          {ilsMessage && (
            <p className="text-sm text-bs-muted">{ilsMessage}</p>
          )}
        </div>
      </section>

      <section className="border-t border-bs-line pt-8">
        <h2
          className="text-xl text-bs-ink mb-4"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Status
        </h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-bs-muted mb-1">
              Approval
            </dt>
            <dd className="text-bs-ink">
              {library?.approved
                ? "Approved"
                : library?.rejected
                  ? "Rejected"
                  : "Pending"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-bs-muted mb-1">
              Library ID
            </dt>
            <dd className="text-bs-ink font-mono text-xs break-all">
              {library?.id || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-bs-danger/25 mt-10 pt-8">
        <h2
          className="text-xl text-bs-danger mb-2"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Delete account
        </h2>
        <p className="text-sm text-bs-muted mb-4 max-w-xl">
          Permanently removes your library, catalog, holds, and login. This
          cannot be undone.
        </p>
        <TextField
          label={`Type “${library?.name || "your library name"}” to confirm`}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          autoComplete="off"
        />
        <div className="mt-4">
          <Button
            variant="danger"
            disabled={
              deleting ||
              !library?.name ||
              confirmName.trim() !== library.name.trim()
            }
            onClick={deleteAccount}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </section>
    </div>
  );
}
