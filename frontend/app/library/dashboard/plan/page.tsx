"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy dashboard plan — use /plan with logged-in dropdown nav */
export default function DashboardPlanRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/plan");
  }, [router]);

  return null;
}
