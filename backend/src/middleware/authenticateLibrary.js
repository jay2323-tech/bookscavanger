import { supabase, supabaseAdmin } from "../config/supabase.js";

export async function authenticateLibrary(req, res, next) {
  try {
    // ✅ Allow CORS preflight
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "This endpoint requires a valid Bearer token",
      });
    }

    const token = authHeader.split(" ")[1];

    // =========================================================
    // 1️⃣ Validate JWT
    // =========================================================
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        error: "Invalid or expired session",
      });
    }

    const userId = authData.user.id;

    // =========================================================
    // 2️⃣ Check ROLE from profiles table (NOT metadata)
    //    Use service role to bypass RLS safely
    // =========================================================
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
      return res.status(403).json({
        error: "Profile not found",
      });
    }

    if (profile.role !== "librarian") {
      return res.status(403).json({
        error: "Librarian access only",
      });
    }

    // =========================================================
    // 3️⃣ Check library approval
    // =========================================================
    const { data: library, error: libError } =
      await supabaseAdmin
        .from("libraries")
        .select("id, approved, rejected")
        .eq("supabase_user_id", userId)
        .single();

    if (libError || !library) {
      return res.status(404).json({
        error: "Library record not found",
      });
    }

    if (library.rejected) {
      return res.status(403).json({
        error: "Library application rejected",
      });
    }

    if (!library.approved) {
      return res.status(403).json({
        error: "Library not approved yet",
      });
    }

    // =========================================================
    // 4️⃣ Attach safe request data
    // =========================================================
    req.user = authData.user;
    req.library = library;

    next();
  } catch (err) {
    console.error("❌ authenticateLibrary error:", err.message);
    return res.status(500).json({
      error: "Authentication failed",
    });
  }
}
