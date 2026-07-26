"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Banner,
  PageHeader,
} from "@/app/components/dashboard/LibrarianShell";
import Button from "@/app/components/ui/Button";
import StatusDot from "@/app/components/ui/StatusDot";
import { authFetch } from "@/app/library/authFetch";
import { supabase } from "@/app/lib/supabaseClient";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

type Hold = {
  id: string;
  title: string;
  author: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

const FILTERS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "rejected", label: "Rejected" },
] as const;

function holdTone(status: string): "ok" | "danger" | "teal" | "muted" {
  if (status === "approved" || status === "fulfilled") return "ok";
  if (status === "rejected") return "danger";
  if (status === "pending") return "teal";
  return "muted";
}

export default function HoldsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
    const res = await authFetch(`${backend}/api/library/holds${qs}`);
    if (!res.ok) throw new Error("Failed to load holds");
    const data = await res.json();
    setHolds(Array.isArray(data) ? data : []);
  }, [filter]);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/library/login");
          return;
        }
        await load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, load]);

  const updateHold = async (id: string, status: string) => {
    if (status === "rejected") {
      const ok = window.confirm("Reject this hold request?");
      if (!ok) return;
    }
    setError("");
    setSuccess("");
    setBusyId(id);
    try {
      const res = await authFetch(`${backend}/api/library/holds/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update hold");
      setSuccess(`Hold ${status}`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update hold");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse py-4">
        <div className="h-8 w-40 bg-bs-line/70 rounded mb-8" />
        <div className="h-48 bg-bs-line/20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bs-fade-in">
      <PageHeader
        title="Holds"
        subtitle="Approve, fulfill, or reject reader requests."
      />

      {error && <Banner tone="error">{error}</Banner>}
      {success && <Banner tone="ok">{success}</Banner>}

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 border-b border-bs-line">
        {FILTERS.map((f) => (
          <button
            key={f.id || "all"}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`pb-2.5 text-sm transition border-b-2 -mb-px ${
              filter === f.id
                ? "border-bs-teal text-bs-teal font-medium"
                : "border-transparent text-bs-muted hover:text-bs-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!holds.length ? (
        <p className="text-sm text-bs-muted py-12 border-t border-bs-line">
          {filter
            ? `No ${filter} holds.`
            : "No hold requests yet. They’ll appear here when readers place them."}
        </p>
      ) : (
        <ul className="divide-y divide-bs-line border-t border-bs-line">
          {holds.map((h) => (
            <li
              key={h.id}
              className="py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-bs-ink">{h.title}</p>
                <p className="text-sm text-bs-muted">
                  {h.author || "Unknown author"}
                </p>
                {h.note && (
                  <p className="text-sm text-bs-ink/80 mt-1 italic">
                    “{h.note}”
                  </p>
                )}
                <p className="text-xs text-bs-muted mt-1.5 tabular-nums">
                  {new Date(h.created_at).toLocaleString()}
                </p>
              </div>
              <StatusDot tone={holdTone(h.status)} label={h.status} />
              {h.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="teal"
                    disabled={busyId === h.id}
                    onClick={() => updateHold(h.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busyId === h.id}
                    onClick={() => updateHold(h.id, "fulfilled")}
                  >
                    Fulfill
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busyId === h.id}
                    onClick={() => updateHold(h.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              )}
              {h.status === "approved" && (
                <Button
                  variant="teal"
                  disabled={busyId === h.id}
                  onClick={() => updateHold(h.id, "fulfilled")}
                >
                  Mark fulfilled
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
