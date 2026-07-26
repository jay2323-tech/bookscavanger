import { supabase } from "@/app/lib/supabaseClient";

/** Authenticated fetch with Supabase JWT for library APIs */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    console.warn("authFetch 401");
  }
  return res;
}
