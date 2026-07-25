"use client";

import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LibrarianOnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        name: "",
        email: "",
        latitude: "",
        longitude: "",
        opens_at: "09:00",
        closes_at: "20:00",
    });

    // ✅ Ensure user is logged in
    useEffect(() => {
        const checkAuth = async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user) {
                router.replace("/library/login");
            }
        };
        checkAuth();
    }, [router]);

    const handleSubmit = async () => {
        setError("");
        setLoading(true);

        try {
            // 1️⃣ Get session + token
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Not authenticated");
            }

            // 2️⃣ Call backend endpoint
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        latitude: form.latitude,
                        longitude: form.longitude,
                        opens_at: form.opens_at,
                        closes_at: form.closes_at,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Onboarding failed");
            }

            // 3️⃣ Redirect to pending
            router.replace("/library/pending");
        } catch (err: any) {
            setError(err.message || "Onboarding failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center py-20 text-bs-muted bg-bs-paper px-4">
            <div className="w-full max-w-md bg-bs-surface p-8 rounded-xl text-bs-ink border border-bs-line">
                <h1 className="text-2xl font-bold text-bs-teal mb-4 text-center">
                    Librarian Onboarding
                </h1>

                <input
                    placeholder="Library Name"
                    className="w-full mb-4 px-4 py-3 rounded bg-bs-paper"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />

                <input
                    placeholder="Contact Email (optional)"
                    className="w-full mb-4 px-4 py-3 rounded bg-bs-paper"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                <input
                    placeholder="Latitude"
                    className="w-full mb-4 px-4 py-3 rounded bg-bs-paper"
                    value={form.latitude}
                    onChange={(e) =>
                        setForm({ ...form, latitude: e.target.value })
                    }
                />

                <input
                    placeholder="Longitude"
                    className="w-full mb-4 px-4 py-3 rounded bg-bs-paper"
                    value={form.longitude}
                    onChange={(e) =>
                        setForm({ ...form, longitude: e.target.value })
                    }
                />

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <input
                        type="time"
                        className="w-full px-4 py-3 rounded bg-bs-paper"
                        value={form.opens_at}
                        onChange={(e) =>
                            setForm({ ...form, opens_at: e.target.value })
                        }
                    />
                    <input
                        type="time"
                        className="w-full px-4 py-3 rounded bg-bs-paper"
                        value={form.closes_at}
                        onChange={(e) =>
                            setForm({ ...form, closes_at: e.target.value })
                        }
                    />
                </div>
                <p className="text-xs text-gray-500 mb-4 -mt-2">
                    Opening hours (local time)
                </p>

                {error && (
                    <p className="text-bs-danger text-sm mb-3">{error}</p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-bs-gold text-bs-gold-ink py-3 rounded-lg font-semibold"
                >
                    {loading ? "Submitting..." : "Submit for Approval"}
                </button>
            </div>
        </div>
    );
}
