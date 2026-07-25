# BOOKSCAVANGER — Product Notes

## What is BookScavenger?
BookScavenger is a book discovery platform where users search for books and find the nearest libraries that have them.

Libraries register, get approved, upload inventory, and readers search by title, author, or ISBN.

---

## Tech Stack

### Frontend
- Next.js (App Router) + Tailwind CSS
- Supabase Auth (email + Google OAuth)
- Geolocation API
- Google Maps (`@react-google-maps/api`) when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set

### Backend
- Node.js + Express
- Supabase (PostgreSQL + Auth JWT)
- Multer + xlsx for Excel uploads

---

## How to Run Locally

### Backend
```bash
cd backend
npm install
npm run dev
```
Default port: **8080**

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Default port: **3000**

---

## Current Features

- Marketing site: `/`, `/about`, `/for-libraries`
- Book search with distance sorting: `/search`
- Map markers + Google Maps directions links
- Library signup → onboarding → pending approval
- Admin approve / reject librarians
- Librarian dashboard: list books, add book, Excel upload
- Roles via `profiles.role`: customer | librarian | admin

---

## Auth model (current)

- **Readers / librarians / admin:** Supabase JWT (`Authorization: Bearer <access_token>`)
- **Onboarding:** any authenticated user can submit a library (role becomes `librarian` on admin approval)
- **Library APIs:** require `profiles.role === librarian` + `libraries.approved === true`

---

## API Endpoints

### Public
`GET /api/books/search?q=&lat=&lng=`

### Library (JWT + approved librarian)
`GET  /api/library/dashboard`
`GET  /api/library/my-books`
`POST /api/library/books` — add one book
`POST /api/library/books/upload` — Excel (`file` field)
`POST /api/library/onboarding` — JWT only (pre-approval)

### Admin (JWT + admin role)
`GET  /api/admin/stats`
`GET  /api/admin/analytics`
`GET  /api/admin/pending-librarians`
`POST /api/admin/approve-librarian` — body `{ libraryId }`
`POST /api/admin/reject-librarian` — body `{ libraryId }`

---

## Excel Upload Format

| Column | Required |
|--------|----------|
| title or Title | yes |
| author or Author | no |
| isbn or ISBN | no |

---

## Environment Variables

### Backend (`.env`)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PORT=8080
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_MAPS_KEY=   # optional
```

---

## What’s next
See `BOOKSCAVANGER_TICKETS.md`.

## License
MIT
