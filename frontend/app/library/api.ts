const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/* -------- PUBLIC SEARCH -------- */
export async function searchBooks(q: string, lat: number, lng: number) {
  const res = await fetch(
    `${BASE_URL}/api/books/search?q=${q}&lat=${lat}&lng=${lng}`
  );

  if (!res.ok) throw new Error("Failed to fetch books");
  return res.json();
}
