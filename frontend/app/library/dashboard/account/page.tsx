"use client";

import Link from "next/link";
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

export default function ReaderAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/library/login?next=/library/dashboard/account");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.role === "librarian") {
          router.replace("/library/dashboard/settings");
          return;
        }
        if (profile?.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }

        const res = await authFetch(`${backend}/api/reader/profile`);
        if (!res.ok) throw new Error("Failed to load account");
        const data = await res.json();
        setEmail(data.email || session.user.email || "");
        setName(data.name || "");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const saveProfile = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await authFetch(`${backend}/api/reader/profile`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setName(data.profile?.name || name.trim());
      setSuccess("Profile saved");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") return;
    const ok = window.confirm(
      "Delete your reader account permanently? This cannot be undone."
    );
    if (!ok) return;

    setError("");
    setSuccess("");
    setDeleting(true);
    try {
      const res = await authFetch(`${backend}/api/reader/account`, {
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

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse py-4">
        <div className="h-8 w-48 bg-bs-line/70 rounded mb-8" />
        <div className="h-40 bg-bs-line/20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl bs-fade-in">
      <PageHeader
        eyebrow="Reader"
        title="Settings"
        subtitle="Manage your profile and account from here."
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
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField label="Email" value={email} disabled readOnly />
        </div>
        <div className="mt-4">
          <Button
            variant="teal"
            disabled={saving || !name.trim()}
            onClick={saveProfile}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </section>

      <section className="mb-10 border-t border-bs-line pt-8">
        <h2
          className="text-xl text-bs-ink mb-2"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Quick links
        </h2>
        <p className="text-sm text-bs-muted mb-4">
          Everything that used to live in the top bar.
        </p>
        <ul className="divide-y divide-bs-line border-t border-bs-line">
          {[
            { href: "/library/dashboard/customer", label: "My shelf" },
            { href: "/search", label: "Find books" },
            { href: "/plan", label: "Book-run planner" },
            { href: "/about", label: "About BookScavenger" },
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="flex py-3.5 text-sm text-bs-ink hover:text-bs-teal transition"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-bs-danger/25 pt-8">
        <h2
          className="text-xl text-bs-danger mb-2"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Delete account
        </h2>
        <p className="text-sm text-bs-muted mb-4 max-w-xl">
          Permanently removes your holds, alerts, and login. This cannot be
          undone.
        </p>
        <TextField
          label='Type “DELETE” to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
        />
        <div className="mt-4">
          <Button
            variant="danger"
            disabled={
              deleting || confirmText.trim().toUpperCase() !== "DELETE"
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
