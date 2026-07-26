import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthRole = "customer" | "librarian" | "admin" | string;

export type LibraryAuthState = {
  approved: boolean;
  rejected: boolean;
} | null;

export type OAuthIntent = "admin" | "reader" | "librarian" | "library" | null;

export type ResolveAuthInput = {
  role: AuthRole;
  library: LibraryAuthState;
  oauthIntent?: OAuthIntent;
};

const INTENT_KEY = "oauth_intent";

/**
 * Single source of truth for post-login / OAuth routing.
 * Never send a customer to the librarian dashboard until role === "librarian".
 */
export function resolveAuthDestination({
  role,
  library,
  oauthIntent = null,
}: ResolveAuthInput): string {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "librarian") {
    if (!library) return "/library/onboarding";
    if (library.rejected) return "/library/rejected";
    if (!library.approved) return "/library/pending";
    return "/library/dashboard/overview";
  }

  if (role === "customer") {
    if (library) {
      if (library.rejected) return "/library/rejected";
      if (!library.approved) return "/library/pending";
      return "/library/pending";
    }

    if (oauthIntent === "librarian") {
      return "/library/onboarding";
    }

    return "/search";
  }

  return "/search";
}

export function getOAuthIntent(): OAuthIntent {
  if (typeof window === "undefined") return null;
  const raw =
    sessionStorage.getItem(INTENT_KEY) || localStorage.getItem(INTENT_KEY);
  if (
    raw === "admin" ||
    raw === "reader" ||
    raw === "librarian" ||
    raw === "library"
  ) {
    return raw;
  }
  return null;
}

export function setOAuthIntent(intent: Exclude<OAuthIntent, null>) {
  sessionStorage.setItem(INTENT_KEY, intent);
  localStorage.setItem(INTENT_KEY, intent);
}

export function clearOAuthIntent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INTENT_KEY);
  localStorage.removeItem(INTENT_KEY);
}

/** Same-origin relative path only (blocks //evil.com). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("://")) return null;
  return next;
}

/** Honor ?next= only for default reader landings. */
export function applySafeNext(
  destination: string,
  next: string | null | undefined
): string {
  const safe = safeNextPath(next);
  if (!safe) return destination;
  if (
    destination === "/search" ||
    destination === "/library/dashboard/customer"
  ) {
    return safe;
  }
  return destination;
}

export async function fetchLibraryState(
  supabase: SupabaseClient,
  userId: string
): Promise<LibraryAuthState> {
  const { data, error } = await supabase
    .from("libraries")
    .select("approved, rejected")
    .eq("supabase_user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch library.");
  return data as LibraryAuthState;
}
