import { supabaseAdmin } from "../config/supabase.js";

export async function createLibraryOnboarding(req, res) {
    try {
        const userId = req.user.id;
        const { name, email, latitude, longitude, opens_at, closes_at } =
            req.body;

        if (!name) {
            return res.status(400).json({
                error: "Library name is required",
            });
        }

        // 1️⃣ Prevent duplicate library
        const { data: existingLibrary } = await supabaseAdmin
            .from("libraries")
            .select("id")
            .eq("supabase_user_id", userId)
            .maybeSingle();

        if (existingLibrary) {
            return res.status(400).json({
                error: "Library already exists for this user",
            });
        }

        // 2️⃣ Create library
        const payload = {
            supabase_user_id: userId,
            name,
            email: email || null,
            latitude: latitude ? Number(latitude) : null,
            longitude: longitude ? Number(longitude) : null,
            approved: false,
            rejected: false,
            opens_at: opens_at || "09:00",
            closes_at: closes_at || "20:00",
        };

        let { error: insertError } = await supabaseAdmin
            .from("libraries")
            .insert(payload);

        // Graceful if hours migration not applied yet
        if (insertError && String(insertError.message).includes("opens_at")) {
            delete payload.opens_at;
            delete payload.closes_at;
            ({ error: insertError } = await supabaseAdmin
                .from("libraries")
                .insert(payload));
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
