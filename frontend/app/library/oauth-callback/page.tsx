"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function OAuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleOAuth = async () => {
            // 🔐 Ensure session is ready
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user;

            if (!user) {
                router.replace("/library/login");
                return;
            }

            // 🔥 SOURCE OF TRUTH → profiles table
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profileError || !profile) {
                router.replace("/library/login");
                return;
            }

            const role = profile.role;

            // =====================================================
            // 👑 ADMIN
            // =====================================================
            if (role === "admin") {
                router.replace("/admin/dashboard");
                return;
            }

            // =====================================================
            // 📚 LIBRARIAN
            // =====================================================
            if (role === "librarian") {
                const { data: library } = await supabase
                    .from("libraries")
                    .select("approved, rejected")
                    .eq("supabase_user_id", user.id)
                    .maybeSingle();

                if (!library) {
                    router.replace("/library/onboarding");
                    return;
                }

                if (library.rejected) {
                    await supabase.auth.signOut();
                    router.replace("/library/rejected");
                    return;
                }

                if (!library.approved) {
                    router.replace("/library/pending");
                    return;
                }

                router.replace("/library/dashboard/librarian");
                return;
            }

            // =====================================================
            // 👤 CUSTOMER
            // =====================================================
            if (role === "customer") {
                const { data: library } = await supabase
                    .from("libraries")
                    .select("approved, rejected")
                    .eq("supabase_user_id", user.id)
                    .maybeSingle();

                // Customer who applied as librarian
                if (library) {
                    if (library.rejected) {
                        await supabase.auth.signOut();
                        router.replace("/library/rejected");
                        return;
                    }

                    if (!library.approved) {
                        router.replace("/library/pending");
                        return;
                    }

                    // Edge case: approved but role not updated yet
                    router.replace("/library/dashboard/librarian");
                    return;
                }

                router.replace("/search");
                return;
            }

            router.replace("/");
        };

        handleOAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">
            <p>Signing you in...</p>
        </div>
    );
}
