"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banner,
  MetricStrip,
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

type Dash = {
  library: {
    name?: string;
    opens_at?: string | null;
    closes_at?: string | null;
  };
  totalBooks: number;
  availableBooks: number;
  pendingHolds: number;
  holdsToday: number;
  recentHolds: Hold[];
};

function openNowLabel(opens?: string | null, closes?: string | null) {
  if (!opens || !closes) return "Hours unset";
  const now = new Date();
  const [oh, om] = opens.split(":").map(Number);
  const [ch, cm] = closes.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const openM = oh * 60 + (om || 0);
  const closeM = ch * 60 + (cm || 0);
  return mins >= openM && mins < closeM ? "Open now" : "Closed";
}

export default function OverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dash, setDash] = useState<Dash | null>(null);

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
        if (res.status === 401 || res.status === 403) {
          router.replace("/library/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load overview");
        setDash(await res.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse py-4">
        <div className="h-8 w-56 bg-bs-line/70 rounded mb-2" />
        <div className="h-4 w-72 bg-bs-line/40 rounded mb-10" />
        <div className="h-24 bg-bs-line/20 rounded mb-8" />
        <div className="h-40 bg-bs-line/20 rounded-xl" />
      </div>
    );
  }

  const openLabel = openNowLabel(
    dash?.library?.opens_at,
    dash?.library?.closes_at
  );

  return (
    <div className="max-w-5xl mx-auto bs-fade-in">
      <PageHeader
        title={dash?.library?.name || "Overview"}
        subtitle="What needs attention at your desk today."
        actions={
          <>
            <Link href="/library/dashboard/holds">
              <Button variant="teal">Holds inbox</Button>
            </Link>
            <Link href="/library/dashboard/catalog">
              <Button variant="secondary">Catalog</Button>
            </Link>
          </>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}

      <MetricStrip
        items={[
          {
            label: "Pending holds",
            value: dash?.pendingHolds ?? 0,
            tone: (dash?.pendingHolds ?? 0) > 0 ? "text-bs-teal" : undefined,
          },
          { label: "Catalog", value: dash?.totalBooks ?? 0 },
          { label: "Available", value: dash?.availableBooks ?? 0 },
          {
            label: "Desk",
            value: openLabel,
            tone:
              openLabel === "Open now" ? "text-bs-ok" : "text-bs-muted",
          },
        ]}
      />

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2
            className="text-xl text-bs-ink"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Needs attention
          </h2>
          <p className="text-xs text-bs-muted tabular-nums">
            {dash?.holdsToday ?? 0} holds today
          </p>
        </div>

        {!dash?.recentHolds?.length ? (
          <p className="text-sm text-bs-muted border-t border-bs-line py-10">
            No pending holds.{" "}
            <Link
              href="/library/dashboard/settings"
              className="text-bs-teal underline-offset-2 hover:underline"
            >
              Check settings
            </Link>{" "}
            or{" "}
            <Link
              href="/library/dashboard/catalog"
              className="text-bs-teal underline-offset-2 hover:underline"
            >
              manage catalog
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-bs-line border-t border-bs-line">
            {dash.recentHolds.map((h) => (
              <li
                key={h.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-bs-ink truncate">{h.title}</p>
                  <p className="text-sm text-bs-muted truncate">
                    {h.author || "Unknown author"}
                    {h.note ? ` · “${h.note}”` : ""}
                  </p>
                </div>
                <StatusDot
                  tone="teal"
                  label={new Date(h.created_at).toLocaleString()}
                />
              </li>
            ))}
          </ul>
        )}

        {(dash?.pendingHolds ?? 0) > 0 && (
          <div className="mt-6">
            <Link href="/library/dashboard/holds">
              <Button variant="ghost">View all holds →</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
