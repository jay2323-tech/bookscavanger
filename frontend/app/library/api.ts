const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

/* -------- PUBLIC SEARCH -------- */
export async function searchBooks(q: string, lat: number, lng: number) {
  const res = await fetch(
    `${BASE_URL}/api/books/search?q=${q}&lat=${lat}&lng=${lng}`
  )

  if (!res.ok) throw new Error("Failed to fetch books")
  return res.json()
}

/* -------- LIBRARY LOGIN -------- */
export async function libraryLogin(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  return res.json()
}

/* -------- LIBRARY SIGNUP -------- */
export async function librarySignup(data: any) {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return res.json()
}
