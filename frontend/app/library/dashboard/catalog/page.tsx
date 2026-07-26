"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Banner,
  PageHeader,
} from "@/app/components/dashboard/LibrarianShell";
import Button from "@/app/components/ui/Button";
import TextField from "@/app/components/ui/TextField";
import { authFetch } from "@/app/library/authFetch";
import { supabase } from "@/app/lib/supabaseClient";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
const PAGE_SIZE = 25;

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  quantity?: number;
  available?: boolean;
};

export default function CatalogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [avail, setAvail] = useState<"all" | "true" | "false">("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    quantity: "1",
  });

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (qDebounced) params.set("q", qDebounced);
    if (avail !== "all") params.set("available", avail);

    const res = await authFetch(
      `${backend}/api/library/my-books?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to load catalog");
    const data = await res.json();
    setBooks(Array.isArray(data) ? data : data.books || []);
    setTotal(Array.isArray(data) ? data.length : data.total ?? 0);
  }, [page, qDebounced, avail]);

  useEffect(() => {
    setPage(0);
  }, [qDebounced, avail]);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/library/login");
          return;
        }
        setLoading(true);
        await load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, load]);

  const handleAdd = async () => {
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
      setShowAdd(false);
      setSuccess("Book added");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add book");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(
        `${backend}/api/library/books/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: form.title.trim(),
            author: form.author.trim(),
            isbn: form.isbn.trim() || null,
            quantity: Number(form.quantity) || 1,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setEditing(null);
      setSuccess("Book updated");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const toggleAvailable = async (book: Book) => {
    setError("");
    try {
      const res = await authFetch(`${backend}/api/library/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ available: book.available === false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`Delete “${book.title}”?`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(`${backend}/api/library/books/${book.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setSuccess("Book deleted");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
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
      if (!session?.access_token) throw new Error("Not authenticated");
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${backend}/api/library/books/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSuccess(`Uploaded ${data.count ?? 0} books`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (book: Book) => {
    setEditing(book);
    setShowAdd(false);
    setForm({
      title: book.title,
      author: book.author || "",
      isbn: book.isbn || "",
      quantity: String(book.quantity ?? 1),
    });
  };

  const openAdd = () => {
    setEditing(null);
    setShowAdd(true);
    setForm({ title: "", author: "", isbn: "", quantity: "1" });
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl mx-auto bs-fade-in">
      <PageHeader
        title="Catalog"
        subtitle="Search, edit availability, import, and add titles."
        actions={
          <Button variant="teal" onClick={openAdd}>
            Add book
          </Button>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}
      {success && <Banner tone="ok">{success}</Banner>}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <TextField
            label="Search"
            placeholder="Title, author, or ISBN"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="sm:w-40">
          <label className="block text-xs uppercase tracking-[0.1em] text-bs-muted mb-1.5">
            Availability
          </label>
          <select
            value={avail}
            onChange={(e) =>
              setAvail(e.target.value as "all" | "true" | "false")
            }
            className="w-full rounded-lg border border-bs-line bg-bs-surface px-3 py-2.5 text-sm text-bs-ink"
          >
            <option value="all">All</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </div>
      </div>

      {(showAdd || editing) && (
        <section className="mb-8 border border-bs-line rounded-xl p-4 sm:p-5 bg-bs-surface/60">
          <h2
            className="text-lg text-bs-ink mb-4"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {editing ? "Edit book" : "Add book"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              label="Author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <TextField
              label="ISBN"
              value={form.isbn}
              onChange={(e) => setForm({ ...form, isbn: e.target.value })}
            />
            <TextField
              label="Quantity"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="teal"
              disabled={adding || !form.title.trim() || !form.author.trim()}
              onClick={editing ? handleSaveEdit : handleAdd}
            >
              {adding ? "Saving…" : editing ? "Save changes" : "Add to catalog"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2
          className="text-lg text-bs-ink mb-2"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Import spreadsheet
        </h2>
        <p className="text-sm text-bs-muted mb-3">
          Excel/CSV with columns title, author, isbn, quantity.
        </p>
        <label className="inline-flex">
          <span className="sr-only">Upload file</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={uploading}
            onChange={(e) => handleExcelUpload(e.target.files?.[0] ?? null)}
            className="text-sm text-bs-muted file:mr-3 file:rounded-lg file:border-0 file:bg-bs-teal-soft file:text-bs-teal file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </label>
        {uploading && (
          <p className="text-sm text-bs-muted mt-2">Uploading…</p>
        )}
      </section>

      {loading ? (
        <div className="h-40 bg-bs-line/20 rounded-xl animate-pulse" />
      ) : !books.length ? (
        <p className="text-sm text-bs-muted py-12 border-t border-bs-line">
          No books match. Add one or import a spreadsheet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto border-t border-bs-line">
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead>
                <tr className="text-xs uppercase tracking-[0.1em] text-bs-muted border-b border-bs-line">
                  <th className="py-3 pr-3 font-medium">Title</th>
                  <th className="py-3 pr-3 font-medium">Author</th>
                  <th className="py-3 pr-3 font-medium">ISBN</th>
                  <th className="py-3 pr-3 font-medium">Qty</th>
                  <th className="py-3 pr-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bs-line">
                {books.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-3 pr-3 font-medium text-bs-ink">
                      {b.title}
                    </td>
                    <td className="py-3 pr-3 text-bs-muted">
                      {b.author || "—"}
                    </td>
                    <td className="py-3 pr-3 text-bs-muted tabular-nums">
                      {b.isbn || "—"}
                    </td>
                    <td className="py-3 pr-3 tabular-nums">
                      {b.quantity ?? 1}
                    </td>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleAvailable(b)}
                        className={`text-xs uppercase tracking-wide ${
                          b.available === false
                            ? "text-bs-danger"
                            : "text-bs-ok"
                        }`}
                      >
                        {b.available === false ? "Unavailable" : "Available"}
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="text-bs-teal text-xs font-medium hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          className="text-bs-danger text-xs font-medium hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-bs-muted">
            <p className="tabular-nums">
              {total} title{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="tabular-nums text-xs">
                {page + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
