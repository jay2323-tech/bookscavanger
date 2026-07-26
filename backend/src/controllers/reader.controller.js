import { supabaseAdmin } from "../config/supabase.js";
import { calculateDistance } from "../utils/distance.js";

/**
 * POST /api/reader/holds
 * body: { title, author?, library_name?, book_id?, library_id?, note? }
 */
export async function createHold(req, res) {
  try {
    const { title, author, library_name, book_id, library_id, note } =
      req.body || {};
    if (!title) {
      return res.status(400).json({ error: "title required" });
    }

    const { data, error } = await supabaseAdmin
      .from("hold_requests")
      .insert({
        user_id: req.user.id,
        title: String(title).slice(0, 200),
        author: author ? String(author).slice(0, 200) : null,
        library_name: library_name ? String(library_name).slice(0, 200) : null,
        book_id: book_id ?? null,
        library_id: library_id ?? null,
        note: note ? String(note).slice(0, 500) : null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message.includes("hold_requests")
          ? "Run database/migrations/003_p2_holds_finds_alerts.sql in Supabase"
          : error.message,
      });
    }

    res.status(201).json({ message: "Hold requested", hold: data });
  } catch (err) {
    console.error("createHold:", err);
    res.status(500).json({ error: "Hold failed" });
  }
}

/** GET /api/reader/holds — my holds */
export async function myHolds(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("hold_requests")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("myHolds:", err);
    res.status(500).json({ error: "Failed to load holds" });
  }
}

/** GET /api/library/holds — librarian inbox (?status=pending|approved|…) */
export async function libraryHolds(req, res) {
  try {
    const statusFilter = String(req.query.status || "").trim();
    const allowed = ["pending", "approved", "rejected", "fulfilled", "cancelled"];

    const byId = await supabaseAdmin
      .from("hold_requests")
      .select("*")
      .eq("library_id", req.library.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (byId.error) throw byId.error;

    let rows = byId.data || [];

    if (req.library.name) {
      const byName = await supabaseAdmin
        .from("hold_requests")
        .select("*")
        .eq("library_name", req.library.name)
        .is("library_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!byName.error && byName.data?.length) {
        const seen = new Set(rows.map((r) => r.id));
        for (const r of byName.data) {
          if (!seen.has(r.id)) rows.push(r);
        }
      }
    }

    rows.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (statusFilter && allowed.includes(statusFilter)) {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    res.json(rows);
  } catch (err) {
    console.error("libraryHolds:", err);
    res.status(500).json({ error: "Failed to load hold requests" });
  }
}

/** PATCH /api/library/holds/:id — status update */
export async function updateHoldStatus(req, res) {
  try {
    const { status } = req.body || {};
    const allowed = ["approved", "rejected", "fulfilled", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("hold_requests")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Hold not found" });
    }

    const owns =
      existing.library_id === req.library.id ||
      (existing.library_id == null &&
        req.library.name &&
        existing.library_name === req.library.name);

    if (!owns) {
      return res.status(403).json({ error: "Not your library's hold" });
    }

    const { data, error } = await supabaseAdmin
      .from("hold_requests")
      .update({ status, library_id: existing.library_id ?? req.library.id })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ hold: data });
  } catch (err) {
    console.error("updateHoldStatus:", err);
    res.status(500).json({ error: "Failed to update hold" });
  }
}

/**
 * POST /api/reader/finds  (also allow anonymous via public route)
 * “I found it” trust signal
 */
export async function createFind(req, res) {
  try {
    const { title, author, library_name, book_id } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "title required" });
    }

    const userId = req.user?.id ?? null;

    const { data, error } = await supabaseAdmin
      .from("book_finds")
      .insert({
        user_id: userId,
        title: String(title).slice(0, 200),
        author: author ? String(author).slice(0, 200) : null,
        library_name: library_name
          ? String(library_name).slice(0, 200)
          : null,
        book_id: book_id ?? null,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message.includes("book_finds")
          ? "Run database/migrations/003_p2_holds_finds_alerts.sql in Supabase"
          : error.message,
      });
    }

    // also analytics
    await supabaseAdmin.from("analytics").insert({
      event_type: "found_it",
      metadata: { title, library_name },
    });

    res.status(201).json({ message: "Thanks — marked as found", find: data });
  } catch (err) {
    console.error("createFind:", err);
    res.status(500).json({ error: "Failed to record find" });
  }
}

/** GET find counts for titles — used to enrich search */
export async function getFindCounts(titles = []) {
  if (!titles.length) return {};
  const { data } = await supabaseAdmin
    .from("book_finds")
    .select("title")
    .in(
      "title",
      titles.map((t) => t).slice(0, 40)
    );

  const counts = {};
  for (const row of data || []) {
    const k = (row.title || "").toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

/**
 * POST /api/reader/alerts
 * body: { query, lat?, lng?, radius_km? }
 */
export async function createAlert(req, res) {
  try {
    const { query, lat, lng, radius_km } = req.body || {};
    if (!query?.trim()) {
      return res.status(400).json({ error: "query required" });
    }

    const { data, error } = await supabaseAdmin
      .from("search_alerts")
      .insert({
        user_id: req.user.id,
        query: String(query).trim().slice(0, 120),
        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,
        radius_km: radius_km != null ? Number(radius_km) : 25,
        active: true,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message.includes("search_alerts")
          ? "Run database/migrations/003_p2_holds_finds_alerts.sql in Supabase"
          : error.message,
      });
    }

    res.status(201).json({ message: "Alert created", alert: data });
  } catch (err) {
    console.error("createAlert:", err);
    res.status(500).json({ error: "Alert failed" });
  }
}

/** GET /api/reader/alerts */
export async function myAlerts(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("search_alerts")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("myAlerts:", err);
    res.status(500).json({ error: "Failed to load alerts" });
  }
}

/** DELETE /api/reader/alerts/:id */
export async function deleteAlert(req, res) {
  try {
    const { error } = await supabaseAdmin
      .from("search_alerts")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("deleteAlert:", err);
    res.status(500).json({ error: "Failed to delete alert" });
  }
}

/**
 * GET /api/reader/alerts/check
 * Returns active alerts that now have matching nearby stock.
 */
export async function checkAlerts(req, res) {
  try {
    const { data: alerts, error } = await supabaseAdmin
      .from("search_alerts")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("active", true);

    if (error) throw error;

    const matches = [];
    for (const alert of alerts || []) {
      const q = alert.query;
      const { data: books } = await supabaseAdmin
        .from("books")
        .select("id, title, author, available, libraries(name, latitude, longitude)")
        .or(`title.ilike.%${q}%,author.ilike.%${q}%`)
        .eq("available", true)
        .limit(20);

      const hits = (books || [])
        .filter((b) => b.libraries)
        .map((b) => {
          const lib = b.libraries;
          let distance = null;
          if (
            alert.lat != null &&
            alert.lng != null &&
            lib.latitude != null &&
            lib.longitude != null
          ) {
            distance = calculateDistance(
              alert.lat,
              alert.lng,
              lib.latitude,
              lib.longitude
            );
          }
          return {
            title: b.title,
            author: b.author,
            library_name: lib.name,
            distance,
          };
        })
        .filter(
          (h) =>
            h.distance == null || h.distance <= (alert.radius_km || 25)
        );

      if (hits.length) {
        matches.push({
          alert_id: alert.id,
          query: alert.query,
          hits: hits.slice(0, 5),
        });
        await supabaseAdmin
          .from("search_alerts")
          .update({ last_matched_at: new Date().toISOString() })
          .eq("id", alert.id);
      }
    }

    res.json({ matches });
  } catch (err) {
    console.error("checkAlerts:", err);
    res.status(500).json({ error: "Alert check failed" });
  }
}

/** GET /api/reader/profile */
export async function getReaderProfile(req, res) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, name, email, approved, created_at")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      // older schemas use full_name
      const fallback = await supabaseAdmin
        .from("profiles")
        .select("id, role, full_name, created_at")
        .eq("id", req.user.id)
        .maybeSingle();
      if (fallback.error) throw error;
      return res.json({
        id: req.user.id,
        email: req.user.email,
        role: fallback.data?.role || "customer",
        name:
          fallback.data?.full_name ||
          req.user.user_metadata?.name ||
          null,
        created_at: fallback.data?.created_at || null,
      });
    }

    res.json({
      id: req.user.id,
      email: profile?.email || req.user.email,
      role: profile?.role || "customer",
      name:
        profile?.name ||
        req.user.user_metadata?.name ||
        null,
      approved: profile?.approved ?? null,
      created_at: profile?.created_at || null,
    });
  } catch (err) {
    console.error("getReaderProfile:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
}

/** PATCH /api/reader/profile — update display name */
export async function updateReaderProfile(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    let { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ name })
      .eq("id", req.user.id)
      .select("id, role, name, email")
      .single();

    if (error && String(error.message).toLowerCase().includes("name")) {
      ({ data, error } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: name })
        .eq("id", req.user.id)
        .select("id, role, full_name")
        .single());
      if (!error && data) {
        data = { ...data, name: data.full_name };
      }
    }

    if (error) throw error;

    await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      user_metadata: { ...(req.user.user_metadata || {}), name },
    });

    res.json({
      message: "Profile updated",
      profile: {
        id: data.id,
        role: data.role,
        name: data.name || name,
        email: data.email || req.user.email,
      },
    });
  } catch (err) {
    console.error("updateReaderProfile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

/** DELETE /api/reader/account — permanently remove reader account */
export async function deleteReaderAccount(req, res) {
  try {
    const userId = req.user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role === "librarian" || profile?.role === "admin") {
      return res.status(403).json({
        error: "Use library settings to delete a librarian account",
      });
    }

    await Promise.all([
      supabaseAdmin.from("hold_requests").delete().eq("user_id", userId),
      supabaseAdmin.from("search_alerts").delete().eq("user_id", userId),
      supabaseAdmin.from("book_finds").delete().eq("user_id", userId),
    ]);

    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: authErr } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("deleteReaderAccount:", err.message);
    res.status(500).json({ error: "Failed to delete account" });
  }
}
