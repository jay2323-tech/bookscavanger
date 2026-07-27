"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getOAuthIntent } from "@/app/library/resolveAuthDestination";

/**
 * Supabase sometimes redirects OAuth to Site URL (/) with tokens in the hash.
 * Forward those to the real callback so login routing works.
 */
export default function AuthHashCatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    // Only forward successful token callbacks — ignore error hashes / empty
    if (!hash.includes("access_token")) return;

    const onCallback =
      pathname?.startsWith("/library/oauth-callback") ||
      pathname?.startsWith("/admin/oauth-callback");

    if (onCallback) return;

    const intent = getOAuthIntent();
    const target =
      intent === "admin"
        ? `/admin/oauth-callback${hash}`
        : `/library/oauth-callback${hash}`;

    router.replace(target);
  }, [pathname, router]);

  return null;
}
