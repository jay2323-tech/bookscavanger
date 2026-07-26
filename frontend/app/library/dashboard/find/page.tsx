"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy dashboard search — use /search with logged-in dropdown nav */
export default function DashboardFindRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/search");
  }, [router]);

  return null;
}
