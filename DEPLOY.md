# Deploy BookScavenger (BS-015)

Repo: https://github.com/jay2323-tech/bookscavanger

## 1. Render (backend)

**Preferred — update the existing service** `bookscavanger-backend`:

1. Open [Render Dashboard](https://dashboard.render.com) → **bookscavanger-backend**
2. **Settings**
   - **Repository:** `jay2323-tech/bookscavanger`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. **Environment** (same values as `backend/.env`):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production`
4. **Manual Deploy** → Deploy latest `main`

**Smoke test** (wait ~1 min if free tier was asleep):

```bash
curl https://bookscavanger-backend.onrender.com/
# {"status":"BookScavenger backend running"}

curl "https://bookscavanger-backend.onrender.com/api/books/similar?title=Atomic"
# JSON array
```

---

## 2. Vercel (frontend)

Do **not** reuse an old project still pointed at `bookscavanger-frontend`. Create/import from the monorepo:

1. [vercel.com/new](https://vercel.com/new) → Import **`jay2323-tech/bookscavanger`**
2. **Root Directory:** `frontend` (Edit → select `frontend`)
3. Framework: Next.js (auto)
4. **Environment Variables:**

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as local |
| `NEXT_PUBLIC_BACKEND_URL` | `https://bookscavanger-backend.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | optional |

5. Deploy → copy the URL (e.g. `https://bookscavanger-….vercel.app`)

---

## 3. Supabase Auth redirect URLs

**Authentication → URL Configuration:**

Add (replace with your real Vercel URL):

- Site URL: `https://YOUR-APP.vercel.app`
- Redirect URLs:
  - `https://YOUR-APP.vercel.app/**`
  - `https://YOUR-APP.vercel.app/library/oauth-callback`
  - `http://localhost:3000/**`
  - `http://localhost:3000/library/oauth-callback`

---

## 4. Done checklist

- [ ] `curl` health on Render returns BookScavenger
- [ ] `/api/books/similar` returns 200 (proves P2 deploy)
- [ ] Vercel home shows BookScavenger marketing
- [ ] `/search` hits Render (Network tab → `onrender.com`)
- [ ] Google login lands on `/library/oauth-callback` then dashboard

Then mark **BS-015** in `BOOKSCAVANGER_TICKETS.md`.
