"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function AdminOAuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    console.error("Session error or not found", sessionError);
                    await supabase.auth.signOut();
                    router.replace("/admin/login");
                    return;
                }

                // Let backend verify admin role
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stats`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    }
                );

                if (!res.ok) {
                    console.error("Admin verification failed with status:", res.status);
                    await supabase.auth.signOut();
                    router.replace("/admin/login");
                    return;
                }

                router.replace("/admin/dashboard");
            } catch (error) {
                console.error("Unexpected error during admin check:", error);
                await supabase.auth.signOut();
                router.replace("/admin/login");
            } finally {
                // Loading state handling if applicable
            }
        };

        checkAdmin();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">
            Verifying admin access...
        </div>
    );
}
