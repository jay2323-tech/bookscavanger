"use client";

import Button from "@/app/components/ui/Button";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LibraryRow = {
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
  verified?: boolean;
  created_at: string;
  book_count: number;
  status: "approved" | "pending" | "rejected";
};

type Filter = "all" | "approved" | "pending" | "rejected";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "rejected", label: "Rejected" },
];

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export default function AdminLibrariesPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [resendingId, setResendingId] = useState<string | number | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/admin/login");
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/libraries`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 401 || res.status === 403) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
          return;
        }

        if (!res.ok) throw new Error("Failed to load libraries");

        if (mounted) {
          setLibraries(await res.json());
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load libraries"
          );
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraries.filter((lib) => {
      if (filter !== "all" && lib.status !== filter) return false;
      if (!q) return true;
      return (
        lib.name.toLowerCase().includes(q) ||
        (lib.email || "").toLowerCase().includes(q) ||
        (lib.website || "").toLowerCase().includes(q) ||
        (lib.phone || "").toLowerCase().includes(q)
      );
    });
  }, [libraries, filter, query]);

  const counts = useMemo(() => {
    return {
      all: libraries.length,
      approved: libraries.filter((l) => l.status === "approved").length,
      pending: libraries.filter((l) => l.status === "pending").length,
      rejected: libraries.filter((l) => l.status === "rejected").length,
    };
  }, [libraries]);

  const resendJoin = async (lib: LibraryRow) => {
    setActionMsg("");
    setResendingId(lib.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/resend-join-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ libraryId: lib.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      if (data.skipped) {
        setActionMsg(
          `Email skipped (${data.reason || "Resend not configured"}). Set RESEND_API_KEY on the backend.`
        );
      } else {
        setActionMsg(`Join email sent to ${data.to || lib.email || "library"}.`);
      }
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setResendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-5 sm:px-8 md:px-10 py-8 md:py-10 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-bs-line/70 rounded mb-8" />
        <div className="h-64 bg-bs-line/30 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 md:px-10 py-8 md:py-10 max-w-6xl mx-auto bs-fade-in">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.14em] text-bs-muted mb-2">
          Admin
        </p>
        <h1
          className="text-3xl md:text-4xl text-bs-ink tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Libraries
        </h1>
        <p className="mt-2 text-bs-muted text-sm md:text-base max-w-xl">
          Review who&apos;s on the platform. Approving a pending library emails
          them a join link; you can resend it anytime for approved libraries.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-bs-danger/30 bg-bs-danger/5 px-4 py-3 text-sm text-bs-danger">
          {error}
        </div>
      )}

      {actionMsg && (
        <div className="mb-6 rounded-xl border border-bs-teal/30 bg-bs-teal-soft/30 px-4 py-3 text-sm text-bs-ink">
          {actionMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg border border-bs-line bg-bs-surface">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                filter === f.id
                  ? "bg-bs-teal-soft text-bs-teal font-medium"
                  : "text-bs-muted hover:text-bs-ink"
              }`}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums text-xs opacity-70">
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone, website…"
          className="sm:ml-auto w-full sm:w-64 rounded-lg border border-bs-line bg-bs-surface px-3 py-2 text-sm text-bs-ink placeholder:text-bs-muted/70 focus:outline-none focus:border-bs-teal"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-bs-line bg-bs-surface">
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-bs-line text-xs uppercase tracking-wider text-bs-muted bg-bs-paper/80">
              <th className="py-3 px-4 font-medium">Library</th>
              <th className="py-3 px-3 font-medium">Contact</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium">Books</th>
              <th className="py-3 px-3 font-medium">Hours</th>
              <th className="py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lib) => (
              <tr
                key={lib.id}
                className="border-b border-bs-line/70 last:border-0 hover:bg-bs-paper/60"
              >
                <td className="py-3 px-4">
                  <p className="font-medium text-bs-ink">
                    {lib.name}
                    {lib.verified ? (
                      <span className="ml-2 text-[11px] font-medium text-bs-teal">
                        Verified
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-bs-muted mt-0.5">
                    Joined {new Date(lib.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td className="py-3 px-3 text-xs text-bs-muted">
                  <p>{lib.email || "—"}</p>
                  <p>{lib.phone || "—"}</p>
                </td>
                <td className="py-3 px-3">
                  <StatusPill status={lib.status} />
                </td>
                <td className="py-3 px-3 tabular-nums text-bs-ink">
                  {lib.book_count.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-bs-muted tabular-nums">
                  {lib.opens_at || "—"}–{lib.closes_at || "—"}
                </td>
                <td className="py-3 px-4">
                  {lib.status === "approved" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="!py-1.5 !px-2.5 text-xs"
                      disabled={resendingId === lib.id}
                      onClick={() => resendJoin(lib)}
                    >
                      {resendingId === lib.id ? "Sending…" : "Resend join email"}
                    </Button>
                  ) : (
                    <span className="text-xs text-bs-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 px-4 text-center text-bs-muted"
                >
                  {libraries.length === 0
                    ? "No libraries yet."
                    : "No libraries match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: LibraryRow["status"] }) {
  const styles =
    status === "approved"
      ? "bg-bs-teal-soft text-bs-teal"
      : status === "rejected"
        ? "bg-bs-danger/10 text-bs-danger"
        : "bg-bs-gold/15 text-bs-gold-ink";

  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${styles}`}
    >
      {status}
    </span>
  );
}
