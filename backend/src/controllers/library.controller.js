import fs from "fs";
import XLSX from "xlsx";
import { supabaseAdmin } from "../config/supabase.js";
import { fetchIlsInventory } from "../connectors/ils.js";
import { indexBooks, meiliEnabled } from "../services/meilisearch.js";

async function maybeIndex(books) {
  if (!meiliEnabled() || !books?.length) return;
  try {
    await indexBooks(books);
  } catch (err) {
    console.warn("Meili index skip:", err.message);
  }
}

/**
 * 📊 GET /api/library/dashboard
 */
export async function getLibraryDashboard(req, res) {
  try {
    const library = req.library;

    const { data: books, error } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("library_id", library.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      library,
      totalBooks: books?.length || 0,
      books,
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err.message);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

/**
 * 📚 GET /api/library/my-books
 */
export async function getMyBooks(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("library_id", req.library.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
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
 * 🕐 PATCH /api/library/hours
 */
export async function updateLibraryHours(req, res) {
  try {
    const { opens_at, closes_at } = req.body;
    if (!opens_at || !closes_at) {
      return res.status(400).json({ error: "opens_at and closes_at required (HH:MM)" });
    }

    const { data, error } = await supabaseAdmin
      .from("libraries")
      .update({ opens_at, closes_at })
      .eq("id", req.library.id)
      .select("id, name, opens_at, closes_at")
      .single();

    if (error) throw error;
    res.json({ message: "Hours updated", library: data });
  } catch (err) {
    console.error("updateLibraryHours:", err.message);
    res.status(500).json({
      error:
        err.message?.includes("opens_at")
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

    // 📊 Analytics event
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
 * body: { type: "koha_csv"|"koha_sru", endpoint: string, query?: string, replace?: boolean }
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
      return res.status(400).json({ error: "No inventory rows returned from ILS" });
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

    // insert in chunks
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

    await supabaseAdmin.from("analytics").insert({
      event_type: "ils_sync",
      library_id: req.library.id,
      metadata: { type, count: inserted, endpoint: String(endpoint).slice(0, 120) },
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
