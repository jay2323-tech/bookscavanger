import { supabaseAdmin } from "../config/supabase.js";

/**
 * 📊 Admin stats
 */
export const getAdminStats = async (req, res) => {
  try {
    const [{ count: libraries }, { count: books }] = await Promise.all([
      supabaseAdmin
        .from("libraries")
        .select("*", { count: "exact", head: true }),

      supabaseAdmin
        .from("books")
        .select("*", { count: "exact", head: true }),
    ]);

    return res.json({
      totalLibraries: libraries ?? 0,
      totalBooks: books ?? 0,
      status: "healthy",
    });
  } catch (err) {
    console.error("getAdminStats:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};

/**
 * 📈 Analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("analytics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error("getAnalytics:", err);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

/**
 * ⏳ Pending librarians
 * SOURCE OF TRUTH = libraries table
 */
export const getPendingLibrarians = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("libraries")
      .select(`
        id,
        name,
        email,
        latitude,
        longitude,
        supabase_user_id,
        created_at,
        approved,
        rejected
      `)
      .eq("approved", false)
      .eq("rejected", false)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error("getPendingLibrarians:", err);
    return res.status(500).json({
      error: "Failed to fetch pending librarians",
    });
  }
};

/**
 * ✅ Approve librarian (PRODUCTION SAFE)
 * Updates:
 * - libraries.approved = true
 * - libraries.rejected = false
 * - profiles.role = librarian
 */
export const approveLibrarian = async (req, res) => {
  try {
    const { libraryId } = req.body;

    if (!libraryId) {
      return res.status(400).json({
        error: "libraryId required",
      });
    }

    // 1️⃣ Fetch library
    const { data: library, error: libErr } = await supabaseAdmin
      .from("libraries")
      .select("id, supabase_user_id, approved, rejected")
      .eq("id", libraryId)
      .single();

    if (libErr || !library) {
      return res.status(404).json({
        error: "Library not found",
      });
    }

    // 2️⃣ Prevent double approval
    if (library.approved) {
      return res.status(400).json({
        error: "Library already approved",
      });
    }

    // 3️⃣ Update library status
    const { error: updateError } = await supabaseAdmin
      .from("libraries")
      .update({
        approved: true,
        rejected: false,
      })
      .eq("id", libraryId);

    if (updateError) {
      throw updateError;
    }

    // 4️⃣ Update profile role (SOURCE OF TRUTH)
    if (library.supabase_user_id) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "librarian" })
        .eq("id", library.supabase_user_id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("approveLibrarian:", err);
    return res.status(500).json({
      error: "Approval failed",
    });
  }
};

/**
 * ❌ Reject librarian application
 * Updates:
 * - libraries.approved = false
 * - libraries.rejected = true
 */
export const rejectLibrarian = async (req, res) => {
  try {
    const { libraryId } = req.body;

    if (!libraryId) {
      return res.status(400).json({
        error: "libraryId required",
      });
    }

    const { data: library, error: libErr } = await supabaseAdmin
      .from("libraries")
      .select("id, approved, rejected")
      .eq("id", libraryId)
      .single();

    if (libErr || !library) {
      return res.status(404).json({
        error: "Library not found",
      });
    }

    if (library.approved) {
      return res.status(400).json({
        error: "Cannot reject an already approved library",
      });
    }

    if (library.rejected) {
      return res.status(400).json({
        error: "Library already rejected",
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("libraries")
      .update({
        approved: false,
        rejected: true,
      })
      .eq("id", libraryId);

    if (updateError) {
      throw updateError;
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("rejectLibrarian:", err);
    return res.status(500).json({
      error: "Rejection failed",
    });
  }
};
