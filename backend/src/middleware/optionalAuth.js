import { supabase } from "../config/supabase.js";

/**
 * Optional JWT — sets req.user if present, otherwise continues.
 */
export async function optionalAuth(req, res, next) {
  try {
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const { data: authData, error } = await supabase.auth.getUser(token);
    if (!error && authData?.user) {
      req.user = authData.user;
    }
    next();
  } catch {
    next();
  }
}
