"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function DashboardRouter() {
    const router = useRouter();

    useEffect(() => {
        const routeUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/library/login");
                return;
            }

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (error || !profile) {
                router.replace("/");
                return;
            }

            if (profile.role === "admin") {
                router.replace("/admin/dashboard");
                return;
            }

            if (profile.role === "librarian") {
                router.replace("/library/dashboard/librarian");
                return;
            }

            // default → customer
            router.replace("/library/dashboard/customer");
        };

        routeUser();
    }, [router]);

    return null;
}
