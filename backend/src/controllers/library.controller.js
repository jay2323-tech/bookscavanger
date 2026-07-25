import fs from "fs";
import XLSX from "xlsx";
import { supabaseAdmin } from "../config/supabase.js";

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

    const { error } = await supabaseAdmin.from("books").insert(formatted);

    fs.unlinkSync(req.file.path);

    if (error) throw error;

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
