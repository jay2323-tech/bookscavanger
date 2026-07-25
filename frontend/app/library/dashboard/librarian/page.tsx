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

type Hold = {
  id: string;
  title: string;
  author: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function LibrarianDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
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
  const [hours, setHours] = useState({ opens_at: "09:00", closes_at: "20:00" });
  const [savingHours, setSavingHours] = useState(false);
  const [tab, setTab] = useState<"holds" | "inventory" | "hours" | "import">(
    "holds"
  );

  const loadBooks = async () => {
    const res = await authFetch(`${backend}/api/library/my-books`);
    if (!res.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await res.json();
    setBooks(Array.isArray(data) ? data : []);
  };

  const loadHolds = async () => {
    try {
      const res = await authFetch(`${backend}/api/library/holds`);
      if (!res.ok) return;
      const data = await res.json();
      setHolds(Array.isArray(data) ? data : []);
    } catch {
      /* migration may not be run yet */
    }
  };

  const updateHold = async (id: string, status: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(`${backend}/api/library/holds/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update hold");
      setSuccess(`Hold ${status}`);
      await loadHolds();
    } catch (err: any) {
      setError(err.message || "Failed to update hold");
    }
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
        await loadHolds();
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

  const handleSaveHours = async () => {
    setError("");
    setSuccess("");
    setSavingHours(true);
    try {
      const res = await authFetch(`${backend}/api/library/hours`, {
        method: "PATCH",
        body: JSON.stringify(hours),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save hours");
      setSuccess("Opening hours updated");
    } catch (err: any) {
      setError(err.message || "Failed to save hours");
    } finally {
      setSavingHours(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-bs-muted">
        Loading...
      </div>
    );
  }

  const tabs = [
    { id: "holds" as const, label: "Holds" },
    { id: "inventory" as const, label: "Inventory" },
    { id: "hours" as const, label: "Hours" },
    { id: "import" as const, label: "Import" },
  ];

  return (
    <div className="max-w-5xl mx-auto bs-fade-in">
      <h1
        className="text-3xl font-semibold mb-2 text-bs-ink"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Librarian dashboard
      </h1>
      <p className="text-bs-muted mb-6">
        Holds, inventory, hours, and imports.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div className="bg-bs-surface text-bs-ink p-4 rounded-lg border border-bs-line">
          <h2 className="text-xs text-bs-muted">Total books</h2>
          <p className="text-2xl font-bold mt-1 text-bs-teal">{books.length}</p>
        </div>
        <div className="bg-bs-surface text-bs-ink p-4 rounded-lg border border-bs-line">
          <h2 className="text-xs text-bs-muted">Available</h2>
          <p className="text-2xl font-bold mt-1 text-bs-teal">
            {books.filter((b) => b.available !== false).length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-bs-line pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border transition ${
              tab === t.id
                ? "bg-bs-teal-soft border-bs-teal text-bs-teal"
                : "bg-bs-surface border-bs-line text-bs-muted hover:text-bs-ink"
            }`}
          >
            {t.label}
            {t.id === "holds" && holds.some((h) => h.status === "pending")
              ? ` (${holds.filter((h) => h.status === "pending").length})`
              : ""}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className="mb-6">
          {error && <p className="text-bs-danger text-sm">{error}</p>}
          {success && <p className="text-bs-ok text-sm">{success}</p>}
        </div>
      )}

      {tab === "holds" && (
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-bs-ink">
          Hold requests
        </h2>
        {holds.length === 0 ? (
          <p className="text-bs-muted text-sm">No hold requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {holds.map((h) => (
              <li
                key={h.id}
                className="bg-bs-surface border border-bs-line rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="text-sm text-bs-muted">
                    {h.author || "Unknown author"} · {h.status}
                    {h.note ? ` · “${h.note}”` : ""}
                  </p>
                </div>
                {h.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateHold(h.id, "approved")}
                      className="text-sm bg-bs-gold text-bs-gold-ink px-3 py-1.5 rounded font-medium"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateHold(h.id, "rejected")}
                      className="text-sm border border-bs-line px-3 py-1.5 rounded"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => updateHold(h.id, "fulfilled")}
                      className="text-sm border border-bs-line px-3 py-1.5 rounded"
                    >
                      Fulfilled
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab === "hours" && (
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-bs-ink">
          Opening hours
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-md">
          <label className="text-sm text-bs-muted">
            Opens
            <input
              type="time"
              className="mt-1 w-full px-4 py-3 rounded bg-bs-surface border border-bs-line"
              value={hours.opens_at}
              onChange={(e) =>
                setHours({ ...hours, opens_at: e.target.value })
              }
            />
          </label>
          <label className="text-sm text-bs-muted">
            Closes
            <input
              type="time"
              className="mt-1 w-full px-4 py-3 rounded bg-bs-surface border border-bs-line"
              value={hours.closes_at}
              onChange={(e) =>
                setHours({ ...hours, closes_at: e.target.value })
              }
            />
          </label>
        </div>
        <button
          onClick={handleSaveHours}
          disabled={savingHours}
          className="mt-4 bg-bs-gold text-bs-gold-ink px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {savingHours ? "Saving..." : "Save hours"}
        </button>
      </section>
      )}

      {tab === "import" && (
      <>
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-bs-ink">Add a book</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            placeholder="Title *"
            className="px-4 py-3 rounded bg-bs-surface border border-bs-line"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Author *"
            className="px-4 py-3 rounded bg-bs-surface border border-bs-line"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
          <input
            placeholder="ISBN (optional)"
            className="px-4 py-3 rounded bg-bs-surface border border-bs-line"
            value={form.isbn}
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
          />
          <input
            placeholder="Quantity"
            type="number"
            min={1}
            className="px-4 py-3 rounded bg-bs-surface border border-bs-line"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <button
          onClick={handleAddBook}
          disabled={adding || !form.title.trim() || !form.author.trim()}
          className="mt-4 bg-bs-gold text-bs-gold-ink px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add book"}
        </button>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2 text-bs-teal">
          Upload Excel
        </h2>
        <p className="text-sm text-bs-muted mb-4">
          Columns: title (required), author, isbn
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={uploading}
          onChange={(e) => handleExcelUpload(e.target.files?.[0] ?? null)}
          className="block text-sm text-bs-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-bs-gold file:text-bs-gold-ink file:font-semibold"
        />
        {uploading && <p className="text-sm text-bs-muted mt-2">Uploading...</p>}
      </section>
      </>
      )}

      {tab === "inventory" && (
      <section>
        <h2 className="text-xl font-semibold mb-4 text-bs-ink">
          Your books
        </h2>
        {books.length === 0 ? (
          <p className="text-bs-muted">No books yet. Add one or upload Excel.</p>
        ) : (
          <ul className="space-y-3">
            {books.map((book) => (
              <li
                key={book.id}
                className="bg-bs-surface border border-bs-line rounded-lg p-4 flex justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">{book.title}</p>
                  <p className="text-sm text-bs-muted">
                    {book.author || "Unknown author"}
                    {book.isbn ? ` · ISBN ${book.isbn}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm shrink-0 ${
                    book.available === false ? "text-bs-danger" : "text-bs-ok"
                  }`}
                >
                  {book.available === false ? "Unavailable" : "Available"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}
