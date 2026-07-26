"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { fetchOnboardingStatus } from "@/app/library/fetchOnboardingStatus";
import {
  clearOAuthIntent,
  resolveAuthDestination,
} from "@/app/library/resolveAuthDestination";

export default function DashboardRouter() {
  const router = useRouter();

  useEffect(() => {
    const routeUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/library/login");
        return;
      }

      try {
        const status = await fetchOnboardingStatus(session.access_token);
        const library = status.library
          ? {
              approved: status.library.approved,
              rejected: status.library.rejected,
            }
          : null;

        if (status.role === "customer") {
          if (library && (!library.approved || library.rejected)) {
            const dest = resolveAuthDestination({
              role: status.role,
              library,
            });
            clearOAuthIntent();
            router.replace(dest);
            return;
          }
          router.replace("/library/dashboard/customer");
          return;
        }

        const dest = resolveAuthDestination({
          role: status.role,
          library,
        });
        clearOAuthIntent();
        router.replace(dest);
      } catch {
        router.replace("/");
      }
    };

    routeUser();
  }, [router]);

  return null;
}
