import { supabase, supabaseAdmin } from "../config/supabase.js";

export const authenticateAdmin = async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.replace("Bearer ", "");

    // 1️⃣ Verify JWT
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = authData.user.id;

    // 2️⃣ Fetch profile using SERVICE ROLE (bypass RLS)
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "Profile not found" });
    }

    // 3️⃣ Check role from DB
    if (profile.role !== "admin") {
      return res.status(403).json({ error: "Admins only" });
    }

    req.admin = profile;
    next();
  } catch (err) {
    console.error("authenticateAdmin:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};
