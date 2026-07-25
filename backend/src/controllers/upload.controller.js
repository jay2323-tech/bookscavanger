import XLSX from "xlsx";
import { supabaseAdmin } from "../config/db.js";

export async function uploadBooksExcel(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const books = data
      .map((row) => ({
        title: row.title || row.Title,
        author: row.author || row.Author || null,
        isbn: row.isbn || row.ISBN || null,
        library_id: req.library.id,
        available: true,
      }))
      .filter((b) => b.title);

    if (!books.length) {
      return res.status(400).json({
        error: "No valid rows found. Excel needs a title (or Title) column.",
      });
    }

    const { error } = await supabaseAdmin.from("books").insert(books);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Books uploaded successfully", count: books.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Excel upload failed" });
  }
}
