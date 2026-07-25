# BookScavenger

Physical book discovery — search by title, author, or ISBN and find the nearest libraries that have the book.

```
bookscavanger/
├── frontend/    # Next.js app (Vercel)
├── backend/     # Express API (Render)
├── database/    # Supabase schema + RLS notes
├── BOOKSCAVANGER_NOTES.md
└── BOOKSCAVANGER_TICKETS.md
```

## Quick start

### 1. Database
Use the SQL in `database/schema.sql` on a Supabase project. See `database/README.md`.

### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:8080
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:8080` in `frontend/.env.local`.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for the full BS-015 checklist.

**Repo:** https://github.com/jay2323-tech/bookscavanger

| Service | Platform | Root dir | Notes |
|---------|----------|----------|--------|
| API | Render | `backend` | `npm install` / `npm start` · Blueprint: `render.yaml` |
| Web | Vercel | `frontend` | Set `NEXT_PUBLIC_BACKEND_URL` to the Render URL |

### Env quick reference

**Render:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`  
**Vercel:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`

## Tickets

See `BOOKSCAVANGER_TICKETS.md`. Platform scale (Meili / PWA / ILS): `P3.md`.
