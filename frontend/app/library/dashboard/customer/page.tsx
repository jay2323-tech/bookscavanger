"use client";

import Link from "next/link";
import StatusDot from "@/app/components/ui/StatusDot";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Hold = {
  id: string;
  title: string;
  library_name: string | null;
  status: string;
  created_at: string;
};

type Alert = {
  id: string;
  query: string;
  radius_km: number;
  active: boolean;
};

type Match = {
  alert_id: string;
  query: string;
  hits: { title: string; library_name: string; distance: number | null }[];
};

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

function holdTone(status: string): "ok" | "danger" | "teal" | "muted" {
  if (status === "approved" || status === "fulfilled") return "ok";
  if (status === "rejected") return "danger";
  if (status === "pending") return "teal";
  return "muted";
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [holds, setHolds] = useState<Hold[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/library/login?next=/library/dashboard/customer");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.role === "librarian") {
        router.replace("/library/dashboard/overview");
        return;
      }
      if (profile?.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      setName(
        profile?.name ||
          session.user.user_metadata?.name ||
          session.user.email ||
          "Reader"
      );
      const headers = { Authorization: `Bearer ${session.access_token}` };

      try {
        const [hRes, aRes, mRes] = await Promise.all([
          fetch(`${backend}/api/reader/holds`, { headers }),
          fetch(`${backend}/api/reader/alerts`, { headers }),
          fetch(`${backend}/api/reader/alerts/check`, { headers }),
        ]);
        if (hRes.ok) setHolds(await hRes.json());
        if (aRes.ok) setAlerts(await aRes.json());
        if (mRes.ok) {
          const data = await mRes.json();
          setMatches(data.matches || []);
        }
      } catch {
        setError("Could not load reader data");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const removeAlert = async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${backend}/api/reader/alerts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse">
        <div className="h-8 w-56 bg-bs-line/70 rounded mb-2" />
        <div className="h-4 w-72 bg-bs-line/40 rounded mb-10" />
        <div className="h-32 bg-bs-line/25 rounded-xl mb-6" />
        <div className="h-40 bg-bs-line/20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl bs-fade-in">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.14em] text-bs-muted mb-2">
          Reader
        </p>
        <h1
          className="text-3xl md:text-4xl text-bs-ink tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {name ? `Hi, ${name.split(" ")[0]}` : "My shelf"}
        </h1>
        <p className="mt-2 text-bs-muted text-sm md:text-base">
          Holds, alerts, and your next book run.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href="/search"
          className="inline-flex bg-bs-gold text-bs-gold-ink px-5 py-2.5 rounded-lg font-semibold text-sm"
        >
          Find a book
        </Link>
        <Link
          href="/plan"
          className="inline-flex border border-bs-line bg-bs-surface px-5 py-2.5 rounded-lg text-bs-teal text-sm"
        >
          Book-run planner
        </Link>
        <Link
          href="/library/dashboard/account"
          className="inline-flex border border-bs-line bg-bs-surface px-5 py-2.5 rounded-lg text-bs-muted text-sm"
        >
          Settings
        </Link>
      </div>

      {error && (
        <p className="text-bs-danger text-sm mb-4 rounded-lg border border-bs-danger/25 bg-bs-danger/5 px-3 py-2">
          {error}
        </p>
      )}

      {matches.length > 0 && (
        <section className="mb-10">
          <h2
            className="text-xl text-bs-ink mb-3"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Alert matches
          </h2>
          <ul className="space-y-2">
            {matches.map((m) => (
              <li
                key={m.alert_id}
                className="bg-bs-teal-soft/60 border border-bs-teal/20 rounded-xl p-4"
              >
                <p className="font-medium text-bs-ink">
                  “{m.query}” is nearby
                </p>
                {m.hits.map((h, i) => (
                  <p key={i} className="text-sm text-bs-muted mt-1">
                    {h.title} @ {h.library_name}
                    {h.distance != null ? ` · ${h.distance.toFixed(1)} km` : ""}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <h2
          className="text-xl text-bs-ink mb-3"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          My holds
        </h2>
        {holds.length === 0 ? (
          <p className="text-bs-muted text-sm">
            No hold requests yet.{" "}
            <Link href="/search" className="text-bs-teal hover:underline">
              Search for a book
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-bs-line border border-bs-line rounded-xl bg-bs-surface">
            {holds.map((h) => (
              <li
                key={h.id}
                className="flex justify-between items-center px-4 py-3.5 text-sm gap-3"
              >
                <span className="text-bs-ink min-w-0">
                  {h.title}
                  {h.library_name ? (
                    <span className="text-bs-muted">
                      {" "}
                      · {h.library_name}
                    </span>
                  ) : null}
                </span>
                <StatusDot tone={holdTone(h.status)} label={h.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2
          className="text-xl text-bs-ink mb-3"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          My alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="text-bs-muted text-sm">
            Create alerts from search (“Alert me nearby”).
          </p>
        ) : (
          <ul className="divide-y divide-bs-line border border-bs-line rounded-xl bg-bs-surface">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex justify-between px-4 py-3.5 text-sm gap-3"
              >
                <span className="text-bs-ink">
                  {a.query}
                  <span className="text-bs-muted"> · {a.radius_km} km</span>
                </span>
                <button
                  type="button"
                  className="text-bs-danger hover:underline shrink-0"
                  onClick={() => removeAlert(a.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
