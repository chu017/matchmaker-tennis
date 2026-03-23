# Deploy SF Tennis Matchmaker

## Option 1: Render (recommended – full stack, free tier)

Render hosts both frontend and backend. Free tier: 750 hours/month.

### Steps

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add deployment config"
   git push origin main
   ```

2. **Create Render account**: [render.com](https://render.com) → Sign up with GitHub

3. **New Web Service**:
   - Dashboard → **New** → **Web Service**
   - Connect your GitHub repo `matchmaker-tennis`
   - Render will detect `render.yaml` or use:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Root Directory**: (leave blank)

4. **Environment variables** (Dashboard → Environment):
   - `MINIMAX_API_KEY` = your key from [platform.minimax.io](https://platform.minimax.io)

5. **Deploy** – Render builds and deploys. Production example: **[SF Tennis Open on Render](https://sf-tennis-open.onrender.com/)** (`https://sf-tennis-open.onrender.com`). New services get a URL like `https://matchmaker-tennis-xxx.onrender.com` until you rename the service.

### Notes

- **Free tier**: Service sleeps after ~15 min of inactivity. First request may take 30–60 seconds.
- **Data**: `participants.json` is stored on the server. On free tier, data can be lost on redeploys or restarts. For long-term persistence, add a database (e.g. Supabase).

---

## Option 2: GitHub Pages (frontend only)

GitHub Pages serves only static files. You need a separate backend (e.g. Render) for the API.

### Steps

1. **Deploy backend on Render** (see Option 1) and note the API URL, e.g. `https://matchmaker-tennis.onrender.com`.

2. **Set API base URL** – create `src/lib/config.ts`:
   ```ts
   export const API_BASE = import.meta.env.PROD
     ? 'https://YOUR-RENDER-URL.onrender.com'
     : '';
   ```
   Update `participantsApi.ts` and `minimaxApi.ts` to use `API_BASE + '/api'`.

3. **Add GitHub Actions** – create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm
         - run: npm ci && npm run build
         - uses: peaceiris/actions-gh-pages@v4
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

4. **Enable GitHub Pages**: Repo → Settings → Pages → Source: **GitHub Actions**.

5. **CORS**: Add your GitHub Pages URL to allowed origins in your Render backend CORS config.

---

## Option 3: Vercel (frontend + serverless)

Vercel can host the frontend and API as serverless functions. Requires refactoring the Express API into Vercel serverless functions.

---

## Quick comparison

| Platform      | Frontend | Backend | Free tier | Best for              |
|---------------|----------|---------|-----------|------------------------|
| **Render**    | ✅       | ✅      | 750 hrs   | Full app, simplest     |
| **GitHub Pages** | ✅    | ❌      | Yes       | Static only            |
| **Vercel**    | ✅       | ✅*     | Yes       | Needs serverless setup |

\* Requires converting Express routes to serverless functions
