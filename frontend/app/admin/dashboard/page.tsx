"use client";

import { supabase } from "@/app/lib/supabaseClient";
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

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [pending, setPending] = useState<PendingLibrarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 🚫 Not logged in
      if (!session) {
        router.replace("/admin/login");
        return;
      }

      try {
        const token = session.access_token;

        // Backend is the ONLY authority for admin access
        const statsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!statsRes.ok) {
          const e = new Error("Failed to load stats");
          (e as any).status = statsRes.status;
          throw e;
        }

        const analyticsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/analytics`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const pendingRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/pending-librarians`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!analyticsRes.ok) {
          const e = new Error("Failed to load analytics");
          (e as any).status = analyticsRes.status;
          throw e;
        }

        if (!pendingRes.ok) {
          const e = new Error("Failed to load pending requests");
          (e as any).status = pendingRes.status;
          throw e;
        }

        if (mounted) {
          setStats(await statsRes.json());
          setAnalytics(await analyticsRes.json());
          setPending(await pendingRes.json());
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Admin dashboard error:", err);
        if (err.status === 401 || err.status === 403) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
        } else {
          if (mounted) {
            setError(err.message || "An unexpected error occurred");
            setLoading(false);
          }
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

    const token = session.access_token;
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ libraryId }),
      }
    );

    if (!res.ok) {
      alert(action === "approve" ? "Approval failed" : "Rejection failed");
      return;
    }

    setPending((prev) => prev.filter((p) => p.id !== libraryId));
  };

  if (loading) {
    return <p className="p-10 text-white">Loading Admin Dashboard...</p>;
  }

  return (
    <main className="min-h-screen bg-[#0F172A] text-white p-10">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span><b>Error:</b> {error}</span>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      <h1 className="text-3xl text-[#D4AF37] mb-6">Admin Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Total Libraries" value={stats.totalLibraries} />
          <Card title="Total Books" value={stats.totalBooks} />
          <Card title="Platform Status" value={stats.status} />
        </div>
      )}

      <h2 className="mt-12 text-2xl text-[#D4AF37]">
        Pending Librarian Approvals
      </h2>

      {pending.length === 0 && (
        <p className="text-gray-400 mt-4">No pending requests 🎉</p>
      )}

      <div className="mt-4 space-y-3">
        {pending.map((p) => (
          <div
            key={p.id}
            className="bg-gray-800 p-4 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-gray-400">{p.email}</p>
            </div>

            <div className="flex gap-2">
              <button
                className="bg-green-600 px-4 py-2 rounded"
                onClick={() => decideLibrarian(p.id, "approve")}
              >
                Approve
              </button>
              <button
                className="bg-red-600 px-4 py-2 rounded"
                onClick={() => decideLibrarian(p.id, "reject")}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl text-[#D4AF37]">Recent Activity</h2>

      <ul className="mt-4 space-y-2">
        {analytics.map((a, i) => (
          <li key={i} className="bg-gray-800 p-3 rounded">
            <b>{a.event_type}</b> —{" "}
            {new Date(a.created_at).toLocaleString()}
          </li>
        ))}
      </ul>

      <button
        className="mt-10 bg-red-500 px-4 py-2 rounded"
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/admin/login");
        }}
      >
        Logout Admin
      </button>
    </main>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow">
      <h2 className="text-lg text-gray-400">{title}</h2>
      <p className="text-3xl text-[#D4AF37] mt-2">{value}</p>
    </div>
  );
}
