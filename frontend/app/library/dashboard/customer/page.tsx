"use client";

import Link from "next/link";
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

export default function CustomerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [holds, setHolds] = useState<Hold[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/library/login");
        return;
      }

      setName(
        session.user.user_metadata?.name || session.user.email || "Reader"
      );
      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };

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
        setError("Could not load reader data (run P2 migration if needed)");
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

  return (
    <div className="max-w-3xl bs-fade-in">
      <h1
        className="text-3xl font-semibold mb-2 text-bs-ink"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Welcome{name ? `, ${name}` : ""}
      </h1>
      <p className="text-bs-muted mb-6">
        Your holds, alerts, and next book run.
      </p>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href="/search"
          className="inline-flex bg-bs-gold text-bs-gold-ink px-5 py-2.5 rounded-lg font-semibold"
        >
          Find a book
        </Link>
        <Link
          href="/plan"
          className="inline-flex border border-bs-line bg-bs-surface px-5 py-2.5 rounded-lg text-bs-teal"
        >
          Book-run planner
        </Link>
      </div>

      {error && <p className="text-bs-danger text-sm mb-4">{error}</p>}

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
                className="bg-bs-teal-soft/60 border border-bs-teal/20 rounded-lg p-4"
              >
                <p className="font-medium text-bs-ink">“{m.query}” is nearby</p>
                {m.hits.map((h, i) => (
                  <p key={i} className="text-sm text-bs-muted">
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
          <ul className="divide-y divide-bs-line border border-bs-line rounded-lg bg-bs-surface">
            {holds.map((h) => (
              <li
                key={h.id}
                className="flex justify-between px-4 py-3 text-sm gap-3"
              >
                <span className="text-bs-ink">
                  {h.title}
                  {h.library_name ? ` · ${h.library_name}` : ""}
                </span>
                <span className="text-bs-teal shrink-0">{h.status}</span>
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
          <ul className="divide-y divide-bs-line border border-bs-line rounded-lg bg-bs-surface">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex justify-between px-4 py-3 text-sm gap-3"
              >
                <span className="text-bs-ink">
                  {a.query} · {a.radius_km} km
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
