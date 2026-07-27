import fs from "fs";
import XLSX from "xlsx";
import { supabaseAdmin } from "../config/supabase.js";
import { fetchIlsInventory } from "../connectors/ils.js";
import { indexBooks, meiliEnabled } from "../services/meilisearch.js";
import { refreshLibraryVerified } from "../services/libraryVerified.js";
import {
  normalizePhone,
  normalizeWebsite,
} from "../utils/libraryVerification.js";

async function maybeIndex(books) {
  if (!meiliEnabled() || !books?.length) return;
  try {
    await indexBooks(books);
  } catch (err) {
    console.warn("Meili index skip:", err.message);
  }
}

/**
 * 📊 GET /api/library/dashboard — overview metrics
 */
export async function getLibraryDashboard(req, res) {
  try {
    const library = req.library;

    const [{ data: books, error: booksErr }, { data: holds, error: holdsErr }] =
      await Promise.all([
        supabaseAdmin
          .from("books")
          .select("id, available")
          .eq("library_id", library.id),
        supabaseAdmin
          .from("hold_requests")
          .select("id, title, author, status, note, created_at")
          .eq("library_id", library.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    if (booksErr) throw booksErr;

    let holdRows = holdsErr ? [] : holds || [];

    // Include name-matched holds without library_id
    if (library.name) {
      const byName = await supabaseAdmin
        .from("hold_requests")
        .select("id, title, author, status, note, created_at")
        .eq("library_name", library.name)
        .is("library_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!byName.error && byName.data?.length) {
        const seen = new Set(holdRows.map((r) => r.id));
        for (const r of byName.data) {
          if (!seen.has(r.id)) holdRows.push(r);
        }
      }
    }

    holdRows.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const bookList = books || [];
    const pendingHolds = holdRows.filter((h) => h.status === "pending");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const holdsToday = holdRows.filter(
      (h) => new Date(h.created_at) >= startOfDay
    ).length;

    res.json({
      library,
      totalBooks: bookList.length,
      availableBooks: bookList.filter((b) => b.available !== false).length,
      pendingHolds: pendingHolds.length,
      holdsToday,
      recentHolds: pendingHolds.slice(0, 8),
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err.message);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

/**
 * 📚 GET /api/library/my-books?q=&available=&limit=&offset=
 */
export async function getMyBooks(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const available = req.query.available;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let query = supabaseAdmin
      .from("books")
      .select("*", { count: "exact" })
      .eq("library_id", req.library.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (available === "true") query = query.eq("available", true);
    if (available === "false") query = query.eq("available", false);

    if (q) {
      // PostgREST or() filter
      const safe = q.replace(/[%_,]/g, "");
      query = query.or(
        `title.ilike.%${safe}%,author.ilike.%${safe}%,isbn.ilike.%${safe}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      books: data || [],
      total: count ?? (data || []).length,
      limit,
      offset,
    });
  } catch (err) {
    console.error("❌ Fetch books error:", err.message);
    res.status(500).json({ error: "Failed to fetch books" });
  }
}

/**
 * ➕ POST /api/library/books
 */
export async function addBook(req, res) {
  try {
    const { title, author, isbn, quantity } = req.body;
    const libraryId = req.library.id;

    if (!title || !author) {
      return res.status(400).json({
        error: "Title and author are required",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("books")
      .insert({
        title,
        author,
        isbn: isbn ?? null,
        quantity: quantity ?? 1,
        library_id: libraryId,
      })
      .select()
      .single();

    if (error) throw error;

    await maybeIndex([data]);
    await refreshLibraryVerified(libraryId);

    res.status(201).json({
      message: "Book added successfully",
      book: data,
    });
  } catch (err) {
    console.error("❌ Add book error:", err.message);
    res.status(500).json({ error: "Failed to add book" });
  }
}

/**
 * PATCH /api/library/books/:id
 */
export async function updateBook(req, res) {
  try {
    const bookId = req.params.id;
    const { title, author, isbn, quantity, available } = req.body || {};

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("books")
      .select("id, library_id")
      .eq("id", bookId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (existing.library_id !== req.library.id) {
      return res.status(403).json({ error: "Not your library's book" });
    }

    const patch = {};
    if (title !== undefined) patch.title = String(title).trim();
    if (author !== undefined) patch.author = String(author).trim();
    if (isbn !== undefined) patch.isbn = isbn ? String(isbn).trim() : null;
    if (quantity !== undefined) patch.quantity = Number(quantity) || 1;
    if (available !== undefined) patch.available = Boolean(available);

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data, error } = await supabaseAdmin
      .from("books")
      .update(patch)
      .eq("id", bookId)
      .select()
      .single();

    if (error) throw error;
    await maybeIndex([data]);
    res.json({ message: "Book updated", book: data });
  } catch (err) {
    console.error("updateBook:", err.message);
    res.status(500).json({ error: "Failed to update book" });
  }
}

/**
 * DELETE /api/library/books/:id
 */
export async function deleteBook(req, res) {
  try {
    const bookId = req.params.id;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("books")
      .select("id, library_id")
      .eq("id", bookId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (existing.library_id !== req.library.id) {
      return res.status(403).json({ error: "Not your library's book" });
    }

    const { error } = await supabaseAdmin
      .from("books")
      .delete()
      .eq("id", bookId);

    if (error) throw error;
    await refreshLibraryVerified(existing.library_id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteBook:", err.message);
    res.status(500).json({ error: "Failed to delete book" });
  }
}

/**
 * PATCH /api/library/profile
 */
export async function updateLibraryProfile(req, res) {
  try {
    const {
      name,
      email,
      website,
      phone,
      latitude,
      longitude,
      opens_at,
      closes_at,
    } = req.body || {};

    const patch = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ error: "Name required" });
      patch.name = trimmed;
    }
    if (email !== undefined) patch.email = email ? String(email).trim() : null;
    if (website !== undefined) {
      const site = normalizeWebsite(website);
      if (!site.ok) return res.status(400).json({ error: site.error });
      patch.website = site.url;
    }
    if (phone !== undefined) {
      const tel = normalizePhone(phone);
      if (!tel.ok) return res.status(400).json({ error: tel.error });
      patch.phone = tel.phone;
    }
    if (latitude !== undefined) {
      patch.latitude = latitude === "" || latitude == null ? null : Number(latitude);
    }
    if (longitude !== undefined) {
      patch.longitude =
        longitude === "" || longitude == null ? null : Number(longitude);
    }
    if (opens_at !== undefined) patch.opens_at = opens_at;
    if (closes_at !== undefined) patch.closes_at = closes_at;

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const selectCols =
      "id, name, email, website, phone, latitude, longitude, opens_at, closes_at, approved, rejected";

    let { data, error } = await supabaseAdmin
      .from("libraries")
      .update(patch)
      .eq("id", req.library.id)
      .select(selectCols)
      .single();

    if (error && String(error.message).includes("website")) {
      return res.status(400).json({
        error:
          "Run database/migrations/005_library_verification.sql in Supabase first",
      });
    }

    if (error && String(error.message).includes("opens_at")) {
      delete patch.opens_at;
      delete patch.closes_at;
      ({ data, error } = await supabaseAdmin
        .from("libraries")
        .update(patch)
        .eq("id", req.library.id)
        .select(
          "id, name, email, website, phone, latitude, longitude, approved, rejected"
        )
        .single());
    }

    if (error) throw error;
    const verified = await refreshLibraryVerified(req.library.id);
    res.json({
      message: "Profile updated",
      library: { ...data, verified },
    });
  } catch (err) {
    console.error("updateLibraryProfile:", err.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

/**
 * DELETE /api/library/account — permanently remove library + auth user
 */
export async function deleteLibraryAccount(req, res) {
  try {
    const libraryId = req.library.id;
    const userId = req.user.id;

    await supabaseAdmin
      .from("hold_requests")
      .delete()
      .eq("library_id", libraryId);

    const { error: libErr } = await supabaseAdmin
      .from("libraries")
      .delete()
      .eq("id", libraryId)
      .eq("supabase_user_id", userId);

    if (libErr) throw libErr;

    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: authErr } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("deleteLibraryAccount:", err.message);
    res.status(500).json({ error: "Failed to delete account" });
  }
}

/**
 * 🕐 PATCH /api/library/hours
 */
export async function updateLibraryHours(req, res) {
  try {
    const { opens_at, closes_at } = req.body;
    if (!opens_at || !closes_at) {
      return res
        .status(400)
        .json({ error: "opens_at and closes_at required (HH:MM)" });
    }

    const { data, error } = await supabaseAdmin
      .from("libraries")
      .update({ opens_at, closes_at })
      .eq("id", req.library.id)
      .select("id, name, opens_at, closes_at")
      .single();

    if (error) throw error;
    const verified = await refreshLibraryVerified(req.library.id);
    res.json({
      message: "Hours updated",
      library: { ...data, verified },
    });
  } catch (err) {
    console.error("updateLibraryHours:", err.message);
    res.status(500).json({
      error: err.message?.includes("opens_at")
        ? "Run database/migrations/002_library_hours.sql in Supabase first"
        : "Failed to update hours",
    });
  }
}

/**
 * 📂 POST /api/library/upload
 */
export async function uploadBooksFromExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const formatted = rows.map((b) => ({
      title: b.title || b.Title,
      author: b.author || b.Author || null,
      isbn: b.isbn || b.ISBN || null,
      quantity: b.quantity || 1,
      library_id: req.library.id,
      available: true,
    }));

    const { data: insertedRows, error } = await supabaseAdmin
      .from("books")
      .insert(formatted)
      .select(
        "id, title, author, isbn, available, library_id, libraries(name, latitude, longitude, opens_at, closes_at)"
      );

    fs.unlinkSync(req.file.path);

    if (error) throw error;

    await maybeIndex(insertedRows || []);
    await refreshLibraryVerified(req.library.id);

    await supabaseAdmin.from("analytics").insert({
      event_type: "upload",
      library_id: req.library.id,
      metadata: { count: formatted.length },
    });

    res.json({
      message: "Books uploaded successfully",
      count: formatted.length,
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
}

/**
 * POST /api/library/ils/sync
 */
export async function syncIls(req, res) {
  try {
    const { type, endpoint, query, replace } = req.body || {};
    if (!type || !endpoint) {
      return res.status(400).json({
        error: "type and endpoint required (koha_csv or koha_sru)",
      });
    }

    const rows = await fetchIlsInventory({ type, endpoint, query });
    if (!rows.length) {
      return res
        .status(400)
        .json({ error: "No inventory rows returned from ILS" });
    }

    if (replace) {
      await supabaseAdmin.from("books").delete().eq("library_id", req.library.id);
    }

    const formatted = rows.map((b) => ({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      quantity: b.quantity ?? 1,
      available: b.available !== false,
      library_id: req.library.id,
    }));

    let inserted = 0;
    for (let i = 0; i < formatted.length; i += 100) {
      const chunk = formatted.slice(i, i + 100);
      const { data, error } = await supabaseAdmin
        .from("books")
        .insert(chunk)
        .select(
          "id, title, author, isbn, available, library_id, libraries(name, latitude, longitude, opens_at, closes_at)"
        );
      if (error) throw error;
      inserted += data?.length || chunk.length;
      await maybeIndex(data || []);
    }

    await refreshLibraryVerified(req.library.id);

    await supabaseAdmin.from("analytics").insert({
      event_type: "ils_sync",
      library_id: req.library.id,
      metadata: {
        type,
        count: inserted,
        endpoint: String(endpoint).slice(0, 120),
      },
    });

    res.json({
      message: "ILS sync complete",
      count: inserted,
      type,
    });
  } catch (err) {
    console.error("syncIls:", err);
    res.status(500).json({ error: err.message || "ILS sync failed" });
  }
}
