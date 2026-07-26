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
        website,
        phone,
        latitude,
        longitude,
        opens_at,
        closes_at,
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

    // Prefer atomic RPC when migration 004 is applied
    const { error: rpcError } = await supabaseAdmin.rpc("approve_librarian", {
      p_library_id: libraryId,
    });

    const rpcMissing =
      !!rpcError &&
      (rpcError.code === "PGRST202" ||
        /could not find the function|schema cache/i.test(
          String(rpcError.message || "")
        ));

    if (rpcError && !rpcMissing) {
      console.warn("approve_librarian RPC:", rpcError.message);
      throw rpcError;
    }

    if (rpcMissing) {
      const { error: updateError } = await supabaseAdmin
        .from("libraries")
        .update({
          approved: true,
          rejected: false,
          reject_reason: null,
        })
        .eq("id", libraryId);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Ensure reject_reason cleared even if RPC predates migration 005
      await supabaseAdmin
        .from("libraries")
        .update({ reject_reason: null })
        .eq("id", libraryId);
    }

    // Always upsert profile — RPC UPDATE is a no-op when the row is missing
    if (library.supabase_user_id) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: library.supabase_user_id,
            role: "librarian",
            approved: true,
          },
          { onConflict: "id" }
        );

      if (profileUpdateError) {
        if (rpcMissing) {
          await supabaseAdmin
            .from("libraries")
            .update({ approved: false, rejected: false })
            .eq("id", libraryId);
        }
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
    const { libraryId, reason } = req.body || {};

    if (!libraryId) {
      return res.status(400).json({
        error: "libraryId required",
      });
    }

    const rejectReason = String(reason || "").trim().slice(0, 500);
    if (!rejectReason) {
      return res.status(400).json({
        error: "A reject reason is required",
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
        reject_reason: rejectReason,
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

/**
 * 🔍 Search insights for admin (BS-026)
 * Aggregates searches, zero-results, top queries, CTR proxy.
 */
export const getSearchInsights = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("analytics")
      .select("event_type, metadata, created_at")
      .in("event_type", ["search", "result_click"])
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const searches = (data || []).filter((e) => e.event_type === "search");
    const clicks = (data || []).filter((e) => e.event_type === "result_click");

    const totalSearches = searches.length;
    const zeroResults = searches.filter(
      (s) => s.metadata?.zero === true || s.metadata?.count === 0
    ).length;
    const zeroRate =
      totalSearches === 0
        ? 0
        : Math.round((zeroResults / totalSearches) * 1000) / 10;

    const byQuery = {};
    for (const s of searches) {
      const q = String(s.metadata?.query || "")
        .toLowerCase()
        .trim();
      if (!q) continue;
      if (!byQuery[q]) {
        byQuery[q] = { query: q, searches: 0, zeros: 0, clicks: 0 };
      }
      byQuery[q].searches += 1;
      if (s.metadata?.zero === true || s.metadata?.count === 0) {
        byQuery[q].zeros += 1;
      }
    }

    for (const c of clicks) {
      const q = String(c.metadata?.query || "")
        .toLowerCase()
        .trim();
      const title = String(c.metadata?.title || "")
        .toLowerCase()
        .trim();
      if (q && byQuery[q]) byQuery[q].clicks += 1;
      else if (title) {
        // attribute click to matching query key if any
        for (const key of Object.keys(byQuery)) {
          if (title.includes(key) || key.includes(title.slice(0, 12))) {
            byQuery[key].clicks += 1;
            break;
          }
        }
      }
    }

    const topQueries = Object.values(byQuery)
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 15)
      .map((row) => ({
        ...row,
        ctr:
          row.searches === 0
            ? 0
            : Math.round((row.clicks / row.searches) * 1000) / 10,
      }));

    const ctr =
      totalSearches === 0
        ? 0
        : Math.round((clicks.length / totalSearches) * 1000) / 10;

    return res.json({
      totalSearches,
      zeroResults,
      zeroRate,
      totalClicks: clicks.length,
      ctr,
      topQueries,
      recentSearches: searches.slice(0, 20).map((s) => ({
        query: s.metadata?.query || "",
        count: s.metadata?.count ?? null,
        zero: s.metadata?.zero === true || s.metadata?.count === 0,
        at: s.created_at,
      })),
    });
  } catch (err) {
    console.error("getSearchInsights:", err);
    return res.status(500).json({ error: "Failed to load search insights" });
  }
};

/**
 * 📚 All libraries (admin directory)
 */
export const getLibraries = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("libraries")
      .select(
        `
        id,
        name,
        email,
        website,
        phone,
        latitude,
        longitude,
        opens_at,
        closes_at,
        approved,
        rejected,
        reject_reason,
        created_at,
        books(count)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const libraries = (data || []).map((row) => {
      const bookCount = Array.isArray(row.books)
        ? Number(row.books[0]?.count ?? 0)
        : 0;
      const { books: _books, ...rest } = row;
      let status = "pending";
      if (row.rejected) status = "rejected";
      else if (row.approved) status = "approved";
      return { ...rest, book_count: bookCount, status };
    });

    return res.json(libraries);
  } catch (err) {
    console.error("getLibraries:", err);
    return res.status(500).json({ error: "Failed to fetch libraries" });
  }
};

/**
 * POST /api/admin/meili-sync — reindex all books into Meilisearch (BS-040)
 */
export const syncMeilisearch = async (req, res) => {
  try {
    const { meiliEnabled, indexBooks, ensureBooksIndex } = await import(
      "../services/meilisearch.js"
    );
    if (!meiliEnabled()) {
      return res.status(400).json({
        error:
          "Meilisearch not configured. Set MEILI_HOST (and optional MEILI_API_KEY).",
      });
    }

    await ensureBooksIndex();

    const { data, error } = await supabaseAdmin
      .from("books")
      .select(
        "id, title, author, isbn, available, library_id, libraries(name, latitude, longitude, opens_at, closes_at)"
      )
      .limit(5000);

    if (error) throw error;

    const { indexed } = await indexBooks(data || []);
    return res.json({
      message: "Meilisearch reindex queued/accepted",
      indexed,
      engine: "meilisearch",
    });
  } catch (err) {
    console.error("syncMeilisearch:", err);
    return res.status(500).json({ error: err.message || "Meili sync failed" });
  }
};
