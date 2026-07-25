import { supabase } from "@/app/lib/supabaseClient";

/**
 * A type-safe wrapper around fetch that automatically injects the Supabase JWT.
 * Use this for protected routes like /api/library/my-books.
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  // 1. Get the current session from Supabase SDK
  const { data: { session } } = await supabase.auth.getSession();
  
  const accessToken = session?.access_token;

  // 2. Prepare headers with correct TypeScript types
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // 3. ONLY add Authorization if the token actually exists
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // 4. Handle Unauthorized
    if (res.status === 401) {
      console.warn("Unauthorized request. Redirecting to login...");
      // Optional: window.location.href = "/library/login";
    }

    return res;
  } catch (err) {
    console.error("authFetch Error:", err);
    throw err;
  }
}