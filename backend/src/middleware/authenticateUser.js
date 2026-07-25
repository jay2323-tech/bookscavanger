import { supabase } from "../config/supabase.js";

/**
 * Requires a valid Supabase JWT only (any role).
 * Used for library onboarding before admin approval.
 */
export async function authenticateUser(req, res, next) {
  try {
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing Bearer token",
      });
    }

    const token = authHeader.split(" ")[1];

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        error: "Invalid or expired session",
      });
    }

    req.user = authData.user;
    next();
  } catch (err) {
    console.error("authenticateUser:", err);
    return res.status(500).json({
      error: "Authentication failed",
    });
  }
}
