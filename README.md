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

**Repo:** https://github.com/jay2323-tech/bookscavanger

### Vercel (frontend)
1. Import `jay2323-tech/bookscavanger`
2. Root Directory → `frontend`
3. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`

### Render (backend)
1. Connect `jay2323-tech/bookscavanger`
2. Root Directory → `backend`
3. Build: `npm install` · Start: `npm start`
4. Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Tickets

See `BOOKSCAVANGER_TICKETS.md`.
