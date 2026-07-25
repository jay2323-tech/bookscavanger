import { supabase, supabaseAdmin } from "../config/supabase.js";

export async function authenticateLibrarianRoleOnly(req, res, next) {
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

        // 1️⃣ Validate JWT
        const { data: authData, error: authError } =
            await supabase.auth.getUser(token);

        if (authError || !authData?.user) {
            return res.status(401).json({
                error: "Invalid or expired session",
            });
        }

        const userId = authData.user.id;

        // 2️⃣ Verify role from profiles (SOURCE OF TRUTH)
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

        req.user = authData.user;
        next();
    } catch (err) {
        console.error("authenticateLibrarianRoleOnly:", err);
        return res.status(500).json({
            error: "Authentication failed",
        });
    }
}
