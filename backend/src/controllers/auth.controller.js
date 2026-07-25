import { supabaseAdmin } from "../config/supabase.js";

/**
 * 📚 Librarian Signup Controller
 * PUBLIC endpoint — NO AUTH required
 */
export async function signupLibrary(req, res) {
  // 🛠️ TEMP DEBUG — confirms request is reaching backend (dev-only, non-sensitive)
  if (process.env.NODE_ENV === 'development') {
    console.log("📦 Signup request received");
  }

  const { name, email, password, latitude, longitude } = req.body;

  // 🛑 Validation
  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Missing required fields: name, email, and password are required.",
    });
  }

  try {
    /**
     * 1️⃣ Create Supabase Auth User
     * Uses SERVICE ROLE KEY
     * Triggers handle_new_user() SQL trigger
     */
    const { data, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "librarian",
          name,
        },
      });

    if (authError) {
      console.error("❌ Supabase auth error:", authError.message);
      throw authError;
    }

    const userId = data.user.id;

    /**
     * 2️⃣ Insert Library Record
     */
    const { error: libError } = await supabaseAdmin
      .from("libraries")
      .insert({
        supabase_user_id: userId,
        name,
        email,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        approved: false,
      });

    /**
     * 3️⃣ Rollback if library insert fails
     */
    if (libError) {
      console.error("❌ Library insert error:", libError.message);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw libError;
    }

    /**
     * ✅ SUCCESS
     */
    return res.status(201).json({
      message: "Librarian registered successfully. Awaiting approval.",
    });
  } catch (err) {
    console.error("❌ Librarian signup error:", err.message);

    // Duplicate email safeguard
    if (err.message?.toLowerCase().includes("already")) {
      return res.status(409).json({
        error: "User already exists with this email.",
      });
    }

    return res.status(500).json({
      error: "Signup failed",
      details: err.message,
    });
  }
}
