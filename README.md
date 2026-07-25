# Lectère

Physical book discovery — search by title, author, or ISBN and find the nearest libraries that have the book.

```
lectere/
├── frontend/    # Next.js app (Vercel)
├── backend/     # Express API (Render / Railway)
├── database/    # Supabase schema + RLS notes
├── LECTÈRE_NOTES.md
└── LECTÈRE_TICKETS.md
```

## Quick start

### 1. Database
Use the SQL in `database/schema.sql` on a Supabase project. See `database/README.md`.

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill Supabase keys
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

## Product

- Readers search books near them
- Libraries onboard → admin approves → upload inventory
- Results sorted by distance; map + directions when available

## Tickets

See `LECTÈRE_TICKETS.md` for the roadmap (LEC-001…).

## Deploy (monorepo)

**Repo:** https://github.com/jay2323-tech/lectere

### Vercel (frontend)
1. Open https://vercel.com/new
2. Import `jay2323-tech/lectere`
3. Set **Root Directory** → `frontend`
4. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL` (your Render URL)

### Render (backend)
1. Open https://dashboard.render.com/
2. New Web Service → connect `jay2323-tech/lectere`
3. Set **Root Directory** → `backend`
4. Build: `npm install` · Start: `npm start` · Instance: Node
5. Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=8080`

Old repos `bookscavanger-frontend` / `bookscavanger-backend` were removed — use this monorepo only.