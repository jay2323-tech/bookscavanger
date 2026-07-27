import { supabaseAdmin } from "../config/supabase.js";

/**
 * Recompute libraries.verified:
 * approved, not rejected, website, phone, hours, and ≥1 book.
 */
export async function refreshLibraryVerified(libraryId) {
  if (!libraryId) return false;

  try {
    const { data: lib, error } = await supabaseAdmin
      .from("libraries")
      .select("id, approved, rejected, website, phone, opens_at, closes_at")
      .eq("id", libraryId)
      .maybeSingle();

    if (error || !lib) return false;

    const { count, error: countErr } = await supabaseAdmin
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("library_id", libraryId);

    if (countErr) throw countErr;

    const verified = !!(
      lib.approved &&
      !lib.rejected &&
      lib.website &&
      lib.phone &&
      lib.opens_at &&
      lib.closes_at &&
      (count ?? 0) >= 1
    );

    await supabaseAdmin
      .from("libraries")
      .update({ verified })
      .eq("id", libraryId);

    return verified;
  } catch (err) {
    console.warn("refreshLibraryVerified:", err.message);
    return false;
  }
}
