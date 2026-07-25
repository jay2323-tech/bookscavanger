/**
 * Optional Meilisearch client (HTTP).
 * When MEILI_HOST is unset, all helpers no-op / return null.
 *
 * Env:
 *   MEILI_HOST=http://127.0.0.1:7700
 *   MEILI_API_KEY=...   (optional for local)
 *   MEILI_INDEX=books
 */

const HOST = () => (process.env.MEILI_HOST || "").replace(/\/$/, "");
const INDEX = () => process.env.MEILI_INDEX || "books";
const KEY = () => process.env.MEILI_API_KEY || "";

export function meiliEnabled() {
  return Boolean(HOST());
}

async function meiliFetch(path, options = {}) {
  const host = HOST();
  if (!host) return null;

  const headers = {
    "Content-Type": "application/json",
    ...(KEY() ? { Authorization: `Bearer ${KEY()}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${host}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meili ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function ensureBooksIndex() {
  if (!meiliEnabled()) return false;
  try {
    await meiliFetch(`/indexes/${INDEX()}`);
  } catch {
    await meiliFetch("/indexes", {
      method: "POST",
      body: JSON.stringify({ uid: INDEX(), primaryKey: "id" }),
    });
  }

  await meiliFetch(`/indexes/${INDEX()}/settings`, {
    method: "PATCH",
    body: JSON.stringify({
      searchableAttributes: ["title", "author", "isbn"],
      filterableAttributes: ["library_id", "available"],
      sortableAttributes: ["title"],
      typoTolerance: { enabled: true },
    }),
  });
  return true;
}

/** Map a Supabase book row (+ libraries join) into a Meili doc */
export function toMeiliDoc(book) {
  const lib = book.libraries || {};
  return {
    id: String(book.id),
    title: book.title || "",
    author: book.author || "",
    isbn: book.isbn || "",
    available: book.available !== false,
    library_id: book.library_id ?? null,
    library_name: lib.name || book.library_name || null,
    latitude: lib.latitude ?? book.latitude ?? null,
    longitude: lib.longitude ?? book.longitude ?? null,
    opens_at: lib.opens_at ?? null,
    closes_at: lib.closes_at ?? null,
  };
}

export async function indexBooks(books = []) {
  if (!meiliEnabled() || !books.length) return { indexed: 0 };
  await ensureBooksIndex();
  const docs = books.map(toMeiliDoc);
  await meiliFetch(`/indexes/${INDEX()}/documents?primaryKey=id`, {
    method: "POST",
    body: JSON.stringify(docs),
  });
  return { indexed: docs.length };
}

/**
 * Search Meili; returns raw docs (caller hydrates / ranks by distance).
 * @returns {Promise<object[]|null>} null if Meili disabled or failed
 */
export async function searchMeili(q, { limit = 80 } = {}) {
  if (!meiliEnabled() || !q) return null;
  try {
    const data = await meiliFetch(`/indexes/${INDEX()}/search`, {
      method: "POST",
      body: JSON.stringify({
        q,
        limit,
        attributesToRetrieve: [
          "id",
          "title",
          "author",
          "isbn",
          "available",
          "library_id",
          "library_name",
          "latitude",
          "longitude",
          "opens_at",
          "closes_at",
        ],
      }),
    });
    return data?.hits || [];
  } catch (err) {
    console.warn("Meili search fallback:", err.message);
    return null;
  }
}
