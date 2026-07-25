"use client";

import { authFetch } from "@/app/library/authFetch";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  quantity?: number;
  available?: boolean;
};

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function LibrarianDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    quantity: "1",
  });

  const loadBooks = async () => {
    const res = await authFetch(`${backend}/api/library/my-books`);
    if (!res.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await res.json();
    setBooks(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          router.replace("/library/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile || profile.role !== "librarian") {
          router.replace("/");
          return;
        }

        await loadBooks();
        setLoading(false);
      } catch (err) {
        console.error("Librarian dashboard error:", err);
        setError("Could not load dashboard");
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

  const handleAddBook = async () => {
    setError("");
    setSuccess("");
    setAdding(true);

    try {
      const res = await authFetch(`${backend}/api/library/books`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          author: form.author.trim(),
          isbn: form.isbn.trim() || null,
          quantity: Number(form.quantity) || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add book");

      setForm({ title: "", author: "", isbn: "", quantity: "1" });
      setSuccess("Book added");
      await loadBooks();
    } catch (err: any) {
      setError(err.message || "Failed to add book");
    } finally {
      setAdding(false);
    }
  };

  const handleExcelUpload = async (file: File | null) => {
    if (!file) return;

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const body = new FormData();
      body.append("file", file);

      const res = await fetch(`${backend}/api/library/books/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setSuccess(`Uploaded ${data.count ?? 0} books`);
      await loadBooks();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Librarian Dashboard</h1>
      <p className="text-gray-400 mb-8">
        Manage your library inventory on Lectère.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="bg-neutral-900 text-white p-6 rounded-lg border border-gray-800">
          <h2 className="text-sm text-neutral-400">Total Books</h2>
          <p className="text-3xl font-bold mt-2 text-[#D4AF37]">{books.length}</p>
        </div>
        <div className="bg-neutral-900 text-white p-6 rounded-lg border border-gray-800">
          <h2 className="text-sm text-neutral-400">Available</h2>
          <p className="text-3xl font-bold mt-2 text-[#D4AF37]">
            {books.filter((b) => b.available !== false).length}
          </p>
        </div>
      </div>

      {(error || success) && (
        <div className="mb-6">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}
        </div>
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-[#D4AF37]">Add a book</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            placeholder="Title *"
            className="px-4 py-3 rounded bg-gray-900 border border-gray-800"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Author *"
            className="px-4 py-3 rounded bg-gray-900 border border-gray-800"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
          <input
            placeholder="ISBN (optional)"
            className="px-4 py-3 rounded bg-gray-900 border border-gray-800"
            value={form.isbn}
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
          />
          <input
            placeholder="Quantity"
            type="number"
            min={1}
            className="px-4 py-3 rounded bg-gray-900 border border-gray-800"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <button
          onClick={handleAddBook}
          disabled={adding || !form.title.trim() || !form.author.trim()}
          className="mt-4 bg-[#D4AF37] text-black px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add book"}
        </button>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2 text-[#D4AF37]">
          Upload Excel
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Columns: title (required), author, isbn
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={uploading}
          onChange={(e) => handleExcelUpload(e.target.files?.[0] ?? null)}
          className="block text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#D4AF37] file:text-black file:font-semibold"
        />
        {uploading && <p className="text-sm text-gray-400 mt-2">Uploading...</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-[#D4AF37]">
          Your books
        </h2>
        {books.length === 0 ? (
          <p className="text-gray-400">No books yet. Add one or upload Excel.</p>
        ) : (
          <ul className="space-y-3">
            {books.map((book) => (
              <li
                key={book.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">{book.title}</p>
                  <p className="text-sm text-gray-400">
                    {book.author || "Unknown author"}
                    {book.isbn ? ` · ISBN ${book.isbn}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm shrink-0 ${
                    book.available === false ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {book.available === false ? "Unavailable" : "Available"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
