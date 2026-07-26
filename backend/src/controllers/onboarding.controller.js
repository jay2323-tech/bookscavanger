import { supabaseAdmin } from "../config/supabase.js";

/**
 * Application status for the logged-in user (service role — bypasses RLS).
 */
async function ensureProfile(userId, user, { role = "customer", approved = false } = {}) {
  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    null;

  let { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) throw profileErr;

  if (!profile) {
    // Live DB uses `name` (not full_name) + optional `approved` flag
    const { data: created, error: upsertErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          name: displayName,
          role,
          approved,
        },
        { onConflict: "id" }
      )
      .select("role")
      .maybeSingle();

    if (upsertErr) {
      console.error("profile upsert:", upsertErr.message);
      return { role };
    }
    return created || { role };
  }

  return profile;
}

export async function getLibraryOnboardingStatus(req, res) {
  try {
    const userId = req.user.id;

    const { data: library, error } = await supabaseAdmin
      .from("libraries")
      .select(
        "id, name, email, latitude, longitude, opens_at, closes_at, approved, rejected, created_at"
      )
      .eq("supabase_user_id", userId)
      .maybeSingle();

    if (error) throw error;

    // If library is already approved, profile must be librarian (self-heal stuck pending)
    const shouldBeLibrarian = !!(library?.approved && !library?.rejected);

    let profile = await ensureProfile(req.user.id, req.user, {
      role: shouldBeLibrarian ? "librarian" : "customer",
      approved: shouldBeLibrarian,
    });

    if (shouldBeLibrarian && profile.role !== "librarian") {
      const { data: updated, error: roleErr } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            role: "librarian",
            approved: true,
            name:
              req.user.user_metadata?.name ||
              req.user.user_metadata?.full_name ||
              req.user.email ||
              null,
          },
          { onConflict: "id" }
        )
        .select("role")
        .maybeSingle();

      if (roleErr) {
        console.error("promote librarian:", roleErr.message);
      } else {
        profile = updated || { role: "librarian" };
      }
    }

    return res.json({
      role: profile?.role || (shouldBeLibrarian ? "librarian" : "customer"),
      library: library || null,
    });
  } catch (err) {
    console.error("getLibraryOnboardingStatus:", err);
    return res.status(500).json({ error: "Failed to load status" });
  }
}

/**
 * Create or update a pending library application.
 * - New user → insert
 * - Existing pending → update details
 * - Rejected → must call /reapply first
 * - Approved → blocked
 */
export async function createLibraryOnboarding(req, res) {
  try {
    const userId = req.user.id;
    const { name, email, latitude, longitude, opens_at, closes_at } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Library name is required",
      });
    }

    const { data: existingLibrary } = await supabaseAdmin
      .from("libraries")
      .select("id, approved, rejected")
      .eq("supabase_user_id", userId)
      .maybeSingle();

    if (existingLibrary?.approved) {
      return res.status(400).json({
        error: "Library already approved",
      });
    }

    if (existingLibrary?.rejected) {
      return res.status(400).json({
        error: "Application was rejected. Use re-apply first.",
      });
    }

    const payload = {
      name,
      email: email || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      approved: false,
      rejected: false,
      opens_at: opens_at || "09:00",
      closes_at: closes_at || "20:00",
    };

    if (existingLibrary) {
      let { error: updateError } = await supabaseAdmin
        .from("libraries")
        .update(payload)
        .eq("id", existingLibrary.id);

      if (updateError && String(updateError.message).includes("opens_at")) {
        delete payload.opens_at;
        delete payload.closes_at;
        ({ error: updateError } = await supabaseAdmin
          .from("libraries")
          .update(payload)
          .eq("id", existingLibrary.id));
      }

      if (updateError) {
        console.error("Library update error:", updateError.message);
        return res.status(400).json({ error: updateError.message });
      }

      return res.status(200).json({
        message: "Library application updated",
      });
    }

    const insertPayload = {
      supabase_user_id: userId,
      ...payload,
    };

    let { error: insertError } = await supabaseAdmin
      .from("libraries")
      .insert(insertPayload);

    if (insertError && String(insertError.message).includes("opens_at")) {
      delete insertPayload.opens_at;
      delete insertPayload.closes_at;
      ({ error: insertError } = await supabaseAdmin
        .from("libraries")
        .insert(insertPayload));
    }

    if (insertError) {
      console.error("Library insert error:", insertError.message);
      return res.status(400).json({
        error: insertError.message,
      });
    }

    return res.status(201).json({
      message: "Library submitted for approval",
    });
  } catch (err) {
    console.error("createLibraryOnboarding:", err);
    return res.status(500).json({
      error: "Onboarding failed",
    });
  }
}

/**
 * Reset a rejected application so the librarian can edit and resubmit.
 */
export async function reapplyLibraryOnboarding(req, res) {
  try {
    const userId = req.user.id;

    const { data: library, error } = await supabaseAdmin
      .from("libraries")
      .select("id, approved, rejected")
      .eq("supabase_user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!library) {
      return res.status(404).json({ error: "No library application found" });
    }

    if (library.approved) {
      return res.status(400).json({ error: "Library already approved" });
    }

    if (!library.rejected) {
      return res.status(400).json({
        error: "Application is not rejected; nothing to re-apply",
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("libraries")
      .update({ rejected: false, approved: false })
      .eq("id", library.id);

    if (updateError) throw updateError;

    return res.json({ success: true, message: "You can update and resubmit" });
  } catch (err) {
    console.error("reapplyLibraryOnboarding:", err);
    return res.status(500).json({ error: "Re-apply failed" });
  }
}
