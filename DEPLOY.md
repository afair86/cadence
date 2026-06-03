# Deploy Cadence to a live site

Plain guide for a permanent URL Mel can bookmark — no Cloudflare tunnel, no PC left on.

---

## Go live on Vercel (website) + Render (API)

Cadence is two pieces:

| Piece | Host | Why |
|-------|------|-----|
| **Website** (what Mel opens) | **Vercel** | Fast, free, permanent HTTPS URL |
| **API + database** | **Render** | Keeps your data and login working 24/7 |

You need **both**. Vercel alone cannot run the database or API.

---

### Step 1 — Push code to GitHub

1. Create a new repo on [github.com/new](https://github.com/new) (e.g. `cadence`)
2. In PowerShell:

```powershell
cd C:\Users\adamf\cadence
git init
git add .
git commit -m "Initial Cadence MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/cadence.git
git push -u origin main
```

---

### Step 2 — Render: database + API (~10 min)

1. Go to [render.com](https://render.com) → sign up → **New** → **Blueprint**
2. Connect your GitHub repo → Render reads `render.yaml` automatically
3. Click **Apply** — it creates PostgreSQL + the API service
4. When the API is live, open the service → copy the URL (e.g. `https://cadence-api.onrender.com`)
5. In the API service → **Environment** → add:
   - `PUBLIC_API_URL` = same URL (e.g. `https://cadence-api.onrender.com`)
6. **Shell** tab (one time) → run demo seed:
   ```bash
   pnpm --filter @cadence/api db:seed
   ```
7. Check: open `https://cadence-api.onrender.com/health` — should say `"status":"ok"`

---

### Step 3 — Vercel: website (~5 min)

1. Go to [vercel.com](https://vercel.com) → sign up → **Add New** → **Project**
2. Import your GitHub `cadence` repo
3. **Important settings:**

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | `apps/web` |
   | **Framework Preset** | Vite |
   | **Include source files outside Root Directory** | ✅ **Enable** (required for monorepo) |

   Build/install commands are already in `apps/web/vercel.json` — leave defaults unless Vercel asks.

4. **Environment Variables** → add:

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | `https://cadence-api.onrender.com` (your Render API URL from step 2) |

5. Click **Deploy**
6. When done, Vercel gives you a URL like `https://cadence-xxxxx.vercel.app`

---

### Step 4 — Test

1. Open `https://YOUR-VERCEL-URL.vercel.app/login`
2. Login: `alex@demo.com` / `demo1234`
3. Dashboard, Messages, Calendar, Commitments should all load

**Share that Vercel URL with Mel** — it works from any network, no tunnel.

---

### Deploy updates later

Push to GitHub `main` → Vercel and Render redeploy automatically.

Or from your PC (website only):

```powershell
cd C:\Users\adamf\cadence
vercel login          # once
pnpm deploy:web       # after VITE_API_URL is set in Vercel dashboard
```

---

### Custom domain (optional, later)

- `app.yourdomain.com` → Vercel project → Settings → Domains
- `api.yourdomain.com` → Render service → Settings → Custom Domain
- Update `VITE_API_URL` in Vercel to the new API domain and redeploy

---

## Path A — Quick tunnel (PC must stay on)

| Setup | Status | URL |
|-------|--------|-----|
| **Cloudflare Tunnel** | Used now for phone / remote testing | `https://something.trycloudflare.com` (temporary) |
| **api.ironcompass.app** | Planned, not live yet | See `APP/LAUNCH_QUEUE.md` Phase 0 |
| **app.ironcompass.app** | Planned, not live yet | Same |

Iron Compass docs (`START_ON_YOUR_PHONE.md`) say: for quick real-world tests, run a **Cloudflare Tunnel** to your PC. For a permanent site, use **Render** or **Railway** (API + database) plus **Vercel** or **Cloudflare Pages** (website).

**Cadence should follow the same pattern.**

---

## Path A — Fastest (about 15 minutes, good for this week)

Your PC runs the app; Cloudflare gives you a public HTTPS link. Link dies when you close the tunnel.

### 1. Start database + API + web on your machine

```powershell
cd C:\Users\adamf\cadence
pnpm db:up
pnpm dev
```

Note the web port (e.g. `http://localhost:5176`).

### 2. Install Cloudflare Tunnel (once)

```powershell
winget install Cloudflare.cloudflared
```

### 3. Open two tunnels (two terminal windows)

**Terminal 1 — API:**
```powershell
cloudflared tunnel --url http://127.0.0.1:3001
```
Copy the `https://….trycloudflare.com` URL — this is your **API URL**.

**Terminal 2 — Website:**
```powershell
cloudflared tunnel --url http://127.0.0.1:5176
```
Copy the URL — this is what **Mel opens in her browser**.

### 4. Point the website at the tunneled API

Create `apps/web/.env.production`:

```env
VITE_API_URL=https://YOUR-API-TUNNEL.trycloudflare.com
```

Restart the web dev server, or build for a stable test:

```powershell
cd C:\Users\adamf\cadence\apps\web
pnpm build
pnpm preview
```

Then tunnel the preview port (`4173`) instead of `5176` if you use preview.

### 5. Share with Mel

Send her the **website tunnel URL**. Login: `alex@demo.com` / `demo1234`.

**Catch:** Your PC must stay on, with Docker, servers, and both tunnels running.

---

## Path B — Permanent live site (recommended, about 1–2 hours)

Always-on URLs Mel can bookmark. Same idea as Iron Compass's planned `api.*` + `app.*` setup.

| Piece | Service | Free tier? |
|-------|---------|------------|
| Database + API | **Render** | Yes (with limits) |
| Website | **Vercel** | Yes |

### Step 1 — Push Cadence to GitHub

Create a repo (e.g. `yourname/cadence`) and push `C:\Users\adamf\cadence`.

### Step 2 — Render: PostgreSQL

1. [render.com](https://render.com) → **New** → **PostgreSQL**
2. Name: `cadence-db`
3. Copy the **Internal Database URL**

### Step 3 — Render: API

1. **New** → **Web Service** → connect your GitHub repo
2. Settings:
   - **Root directory:** `apps/api`
   - **Build command:** `npm install && npx prisma generate && npx prisma db push`
   - **Start command:** `npx tsx src/index.ts`
   - **Instance:** Free
3. **Environment variables:**

   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | (paste from step 2) |
   | `JWT_SECRET` | long random string |
   | `OPENAI_API_KEY` | optional |
   | `PORT` | `10000` |

4. Deploy → copy URL, e.g. `https://cadence-api.onrender.com`

5. **Seed demo data** (Render shell or one-off job):
   ```bash
   npx tsx prisma/seed.ts
   ```

### Step 4 — Vercel: Website

1. [vercel.com](https://vercel.com) → **Add project** → import repo
2. Settings:
   - **Root directory:** `apps/web`
   - **Framework:** Vite
   - **Build command:** `pnpm build` (or `npm run build`)
3. **Environment variable:**

   | Key | Value |
   |-----|--------|
   | `VITE_API_URL` | `https://cadence-api.onrender.com` |

4. Deploy → you get e.g. `https://cadence-web.vercel.app`

### Step 5 — Test with Mel

1. Open `https://cadence-web.vercel.app/login`
2. Sign in: `alex@demo.com` / `demo1234`
3. Log an activity, check dashboard updates

### Custom domain (later, like Iron Compass)

When you buy a name (e.g. `cadence.app`):

- `app.cadence.app` → Vercel
- `api.cadence.app` → Render

Same split as Iron Compass (`app.ironcompass.app` + `api.ironcompass.app`).

---

## Mobile app (Expo) on a live API

In `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://cadence-api.onrender.com
```

Rebuild / restart Expo. Physical phones need the **public** API URL, not `localhost`.

---

## Which path should you pick?

| Goal | Use |
|------|-----|
| Test with Mel **today**, your PC on | **Path A** — Cloudflare Tunnel (same as Iron Compass phone testing) |
| Link she can use **anytime** without your PC | **Path B** — Render + Vercel |
| Match Iron Compass long-term | Path B + custom domains later |

---

## Checklist before sharing

- [ ] Mel can open the login page (not localhost)
- [ ] Login works (`alex@demo.com` / `demo1234`)
- [ ] Dashboard loads contacts and smart plan
- [ ] Logging an activity updates points
- [ ] URL starts with `https://`
