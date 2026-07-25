import { supabase } from "../config/supabase.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (data.user.user_metadata?.role !== "admin") {
      return res.status(403).json({ error: "Admins only" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error("Admin auth failed:", err);
    res.status(500).json({ error: "Internal auth error" });
  }
};
