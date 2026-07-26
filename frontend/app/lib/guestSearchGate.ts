const SEARCH_COUNT_KEY = "bs_guest_search_count";
const PENDING_DIRECTIONS_KEY = "bs_pending_directions";

export function getGuestSearchCount(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(sessionStorage.getItem(SEARCH_COUNT_KEY) || "0");
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Call after a successful guest search. Returns the new count. */
export function recordGuestSearch(): number {
  if (typeof window === "undefined") return 0;
  const next = getGuestSearchCount() + 1;
  sessionStorage.setItem(SEARCH_COUNT_KEY, String(next));
  return next;
}

/**
 * Guests get 1 free search to browse results.
 * Directions require login once that search has happened.
 */
export function guestNeedsLoginForDirections(isLoggedIn: boolean): boolean {
  if (isLoggedIn) return false;
  return getGuestSearchCount() >= 1;
}

export function stashPendingDirections(mapsUrl: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_DIRECTIONS_KEY, mapsUrl);
}

/** Read pending Maps URL without clearing (for resume banner). */
export function peekPendingDirections(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PENDING_DIRECTIONS_KEY);
}

/** Clear pending Maps URL after user continues or dismisses. */
export function clearPendingDirections() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_DIRECTIONS_KEY);
}

export function loginHrefForDirections(mapsUrl?: string): string {
  if (mapsUrl) stashPendingDirections(mapsUrl);
  const next =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/search";
  return `/library/login?next=${encodeURIComponent(next)}`;
}
