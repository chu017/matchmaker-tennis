# Deploy with GitHub

This app is a **Node API + React build**. GitHub hosts your **code**; you still need a **host** that runs Node (for the API and `npm start`).

---

## Step 1: Put the project on GitHub

```bash
cd /path/to/matchmaker-tennis

# If not already a repo
git init
git add .
git commit -m "Initial commit"

# Create an empty repo on github.com (no README), then:
git remote add origin https://github.com/YOUR_USERNAME/matchmaker-tennis.git
git branch -M main
git push -u origin main
```

**Do not commit secrets.** `.env` is gitignored. Set `ADMIN_SECRET`, `MINIMAX_API_KEY`, etc. only on the host’s dashboard.

---

## Step 2: Deploy the full app (recommended)

### Render + GitHub (easiest)

1. Push your repo to GitHub (Step 1).
2. Sign up at [render.com](https://render.com) with **GitHub**.
3. **New** → **Web Service** → pick repo `matchmaker-tennis`.
4. Render can read **`render.yaml`** in the repo:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
5. In Render → **Environment**, add:
   - `ADMIN_SECRET` – for `/admin`
   - `MINIMAX_API_KEY` – optional, for AI features
6. Deploy. Your URL will look like `https://matchmaker-tennis.onrender.com`.

Every `git push` to the connected branch can trigger a new deploy (enable in Render settings).

**Note:** Free tier may sleep; first load can be slow. JSON files on disk may reset on redeploy—see [DEPLOYMENT.md](./DEPLOYMENT.md) for databases.

---

## Step 3 (optional): GitHub Pages for frontend only

GitHub Pages only serves **static** files. Your **API must live elsewhere** (e.g. Render).

1. Deploy the **backend** on Render (same repo, Web Service as above).
2. At build time, point the frontend to that API using a Vite env var (e.g. `VITE_API_BASE=https://your-app.onrender.com`).
3. Change fetches from `'/api/...'` to `` `${import.meta.env.VITE_API_BASE || ''}/api/...` `` (or a small `apiUrl()` helper).
4. Add a GitHub Actions workflow that runs `npm ci && npm run build` and publishes `dist/` to the `gh-pages` branch (or use **Actions** as the Pages source in repo **Settings → Pages**).

Details and a sample workflow: **[DEPLOYMENT.md](./DEPLOYMENT.md)** → Option 2.

---

## Quick reference

| Goal                         | What to use                                      |
|-----------------------------|---------------------------------------------------|
| Full app from GitHub        | **Render** Web Service + `render.yaml`           |
| Only store code on GitHub   | `git push` to your repo                          |
| Static site on github.io    | **GitHub Pages** + separate API URL (needs code change) |

For more options (Vercel, CORS, data persistence), see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.
