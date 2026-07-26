"use client";

import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Stats = {
  totalLibraries: number;
  totalBooks: number;
  status: string;
};

type PendingLibrarian = {
  id: string;
  email: string | null;
  name: string;
  supabase_user_id: string | null;
};

type SearchInsights = {
  totalSearches: number;
  zeroResults: number;
  zeroRate: number;
  totalClicks: number;
  ctr: number;
  topQueries: {
    query: string;
    searches: number;
    zeros: number;
    clicks: number;
    ctr: number;
  }[];
  recentSearches: {
    query: string;
    count: number | null;
    zero: boolean;
    at: string;
  }[];
};

type ActivityItem = {
  event_type: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<ActivityItem[]>([]);
  const [insights, setInsights] = useState<SearchInsights | null>(null);
  const [pending, setPending] = useState<PendingLibrarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      try {
        const token = session.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;

        const [statsRes, analyticsRes, pendingRes, insightsRes] =
          await Promise.all([
            fetch(`${base}/api/admin/stats`, { headers }),
            fetch(`${base}/api/admin/analytics`, { headers }),
            fetch(`${base}/api/admin/pending-librarians`, { headers }),
            fetch(`${base}/api/admin/search-insights`, { headers }),
          ]);

        if (!statsRes.ok) {
          const e = new Error("Failed to load stats");
          (e as Error & { status?: number }).status = statsRes.status;
          throw e;
        }
        if (!analyticsRes.ok) {
          const e = new Error("Failed to load analytics");
          (e as Error & { status?: number }).status = analyticsRes.status;
          throw e;
        }
        if (!pendingRes.ok) {
          const e = new Error("Failed to load pending requests");
          (e as Error & { status?: number }).status = pendingRes.status;
          throw e;
        }

        if (mounted) {
          setStats(await statsRes.json());
          setAnalytics(await analyticsRes.json());
          setPending(await pendingRes.json());
          if (insightsRes.ok) {
            setInsights(await insightsRes.json());
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Admin dashboard error:", err);
        const status =
          err && typeof err === "object" && "status" in err
            ? Number((err as { status: number }).status)
            : 0;
        if (status === 401 || status === 403) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
        } else if (mounted) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred"
          );
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  const decideLibrarian = async (
    libraryId: string,
    action: "approve" | "reject"
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setActingId(libraryId);
    try {
      const endpoint =
        action === "approve"
          ? "/api/admin/approve-librarian"
          : "/api/admin/reject-librarian";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ libraryId }),
        }
      );

      if (!res.ok) {
        alert(action === "approve" ? "Approval failed" : "Rejection failed");
        return;
      }

      setPending((prev) => prev.filter((p) => p.id !== libraryId));
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-6 md:px-10 py-10 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-bs-line/70 rounded mb-2" />
        <div className="h-4 w-72 bg-bs-line/50 rounded mb-10" />
        <div className="grid grid-cols-3 gap-6 mb-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-bs-line/40 rounded-lg" />
          ))}
        </div>
        <div className="h-40 bg-bs-line/30 rounded-xl" />
      </div>
    );
  }

  const statusLabel = stats?.status ?? "—";
  const statusOk =
    typeof statusLabel === "string" &&
    /ok|healthy|online|up/i.test(statusLabel);

  return (
    <div className="px-5 sm:px-8 md:px-10 py-8 md:py-10 max-w-6xl mx-auto bs-fade-in">
      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bs-danger/30 bg-bs-danger/5 px-4 py-3 text-sm text-bs-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-bs-danger/40 px-3 py-1.5 text-xs font-medium hover:bg-bs-danger/10"
          >
            Retry
          </button>
        </div>
      )}

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.14em] text-bs-muted mb-2">
          Admin
        </p>
        <h1
          className="text-3xl md:text-4xl text-bs-ink tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Overview
        </h1>
        <p className="mt-2 text-bs-muted text-sm md:text-base max-w-xl">
          Libraries, search health, and librarian approvals in one place.
        </p>
      </header>

      {/* Platform metrics — typographic strip, not cards */}
      {stats && (
        <section className="mb-12 border-y border-bs-line py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 sm:divide-x divide-bs-line">
            <Link href="/admin/dashboard/libraries" className="block group">
              <Metric
                label="Libraries"
                value={stats.totalLibraries.toLocaleString()}
                valueClassName="text-bs-ink group-hover:text-bs-teal transition-colors"
              />
            </Link>
            <Metric
              label="Books indexed"
              value={stats.totalBooks.toLocaleString()}
              className="sm:px-8"
            />
            <Metric
              label="Platform"
              value={statusLabel}
              className="sm:pl-8"
              valueClassName={statusOk ? "text-bs-ok" : "text-bs-ink"}
            />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10 xl:gap-12">
        {/* Approvals — primary job */}
        <section className="xl:col-span-3">
          <SectionHead
            title="Librarian approvals"
            meta={
              pending.length === 0
                ? "All clear"
                : `${pending.length} waiting`
            }
          />

          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-bs-muted leading-relaxed">
              No pending librarian requests. New signups will appear here for
              review.
            </p>
          ) : (
            <ul className="mt-5 space-y-3 bs-stagger">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-bs-line bg-bs-surface px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-bs-ink truncate">{p.name}</p>
                    <p className="text-sm text-bs-muted truncate">
                      {p.email || "No email on file"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actingId === p.id}
                      onClick={() => decideLibrarian(p.id, "approve")}
                      className="rounded-lg bg-bs-teal px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actingId === p.id}
                      onClick={() => decideLibrarian(p.id, "reject")}
                      className="rounded-lg border border-bs-line px-4 py-2 text-sm font-medium text-bs-muted hover:border-bs-danger hover:text-bs-danger disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="xl:col-span-2">
          <SectionHead title="Recent activity" meta="Latest events" />
          {analytics.length === 0 ? (
            <p className="mt-4 text-sm text-bs-muted">No activity yet.</p>
          ) : (
            <ul className="mt-5 space-y-0 border-l border-bs-line ml-1.5">
              {analytics.slice(0, 12).map((a, i) => (
                <li key={`${a.created_at}-${i}`} className="relative pl-5 pb-5 last:pb-0">
                  <span className="absolute left-0 top-1.5 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-bs-teal ring-4 ring-bs-paper" />
                  <p className="text-sm font-medium text-bs-ink capitalize">
                    {String(a.event_type).replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-bs-muted mt-0.5">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Search insights */}
      {insights && (
        <section className="mt-14 pt-10 border-t border-bs-line">
          <SectionHead
            title="Search health"
            meta="How readers are finding books"
          />

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-bs-line border-y border-bs-line py-5">
            <Metric label="Searches" value={insights.totalSearches.toLocaleString()} />
            <Metric
              label="Zero-result rate"
              value={`${insights.zeroRate}%`}
              className="lg:px-6"
              valueClassName={
                insights.zeroRate > 40 ? "text-bs-danger" : "text-bs-ink"
              }
            />
            <Metric
              label="Result clicks"
              value={insights.totalClicks.toLocaleString()}
              className="lg:px-6"
            />
            <Metric
              label="CTR"
              value={`${insights.ctr}%`}
              className="lg:pl-6"
            />
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-medium text-bs-ink mb-3">
                Top queries
              </h3>
              <div className="overflow-x-auto rounded-xl border border-bs-line bg-bs-surface">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-bs-line text-xs uppercase tracking-wider text-bs-muted bg-bs-paper/80">
                      <th className="py-3 px-4 font-medium">Query</th>
                      <th className="py-3 px-3 font-medium">Searches</th>
                      <th className="py-3 px-3 font-medium">Zeros</th>
                      <th className="py-3 px-3 font-medium">Clicks</th>
                      <th className="py-3 px-4 font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.topQueries.map((row) => (
                      <tr
                        key={row.query}
                        className="border-b border-bs-line/70 last:border-0 hover:bg-bs-paper/60"
                      >
                        <td className="py-2.5 px-4 font-medium text-bs-ink">
                          {row.query}
                        </td>
                        <td className="py-2.5 px-3 text-bs-muted">
                          {row.searches}
                        </td>
                        <td className="py-2.5 px-3 text-bs-muted">{row.zeros}</td>
                        <td className="py-2.5 px-3 text-bs-muted">
                          {row.clicks}
                        </td>
                        <td className="py-2.5 px-4 text-bs-teal tabular-nums">
                          {row.ctr}%
                        </td>
                      </tr>
                    ))}
                    {insights.topQueries.length === 0 && (
                      <tr>
                        <td
                          className="py-8 px-4 text-center text-bs-muted"
                          colSpan={5}
                        >
                          No search data yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-bs-ink mb-3">
                Recent searches
              </h3>
              {insights.recentSearches?.length ? (
                <ul className="rounded-xl border border-bs-line bg-bs-surface divide-y divide-bs-line">
                  {insights.recentSearches.slice(0, 8).map((s, i) => (
                    <li
                      key={`${s.query}-${s.at}-${i}`}
                      className="px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-bs-ink truncate">
                          {s.query}
                        </p>
                        <p className="text-[11px] text-bs-muted mt-0.5">
                          {new Date(s.at).toLocaleString()}
                        </p>
                      </div>
                      {s.zero && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-bs-danger border border-bs-danger/25 rounded px-1.5 py-0.5">
                          Zero
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-bs-muted">No recent searches.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2
        className="text-xl text-bs-ink"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        {title}
      </h2>
      {meta && <p className="text-xs text-bs-muted">{meta}</p>}
    </div>
  );
}

function Metric({
  label,
  value,
  className = "",
  valueClassName = "text-bs-ink",
}: {
  label: string;
  value: string | number;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-[0.12em] text-bs-muted mb-1.5">
        {label}
      </p>
      <p
        className={`text-3xl md:text-[2rem] leading-none tracking-tight tabular-nums ${valueClassName}`}
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        {value}
      </p>
    </div>
  );
}
