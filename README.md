# SF Tennis Matchmaker

A web app to create and manage tennis tournament draws for San Francisco tournaments. Share a link — participants sign up themselves, and the draw updates live for everyone.

## User Journey

1. **Share the URL** — Send the link to potential participants
2. **Self-registration** — Participants enter their name, rating (Elo), and format (singles or doubles)
3. **Live updates** — The system stores signups and automatically generates the draw
4. **Everyone sees** — New visitors see all signed-up participants and the live draw

## Features

- **Self-registration** — Name, rating, singles/doubles (with partner name for doubles)
- **Live draw** — Auto-generated from participants, updates every few seconds
- **Automatic seeding** — By rating (higher rating = better seed)
- **Match predictions** — Elo-based win probabilities
- **Tournament assistant** — Chat with AI about the draw (requires MiniMax API key)
- **Copy link** — Share the tournament URL easily

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env and add your MiniMax API key from https://platform.minimax.io (optional, for AI features)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Note:** `npm run dev` starts both the Vite frontend and the API server. Participant data is stored in `server/participants.json`.

**Troubleshooting:** If you see errors like `Unexpected token '<'` or “HTML instead of JSON”, the browser is loading the app shell instead of the API. Always run the backend on port **3001** (`npm run dev` or `npm run dev:server`). If you use `vite preview`, start the API first — `vite.config.ts` proxies `/api` to 3001 in preview too.

## Data in Supabase (optional)

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` (see **[docs/SUPABASE_SOP.md](./docs/SUPABASE_SOP.md)**). Run the SQL migration in Supabase first. The API then uses Postgres for participants, match results, and event plan; unset those vars to use `server/*.json` again. `GET /api/health` shows `"store": "supabase"` or `"json"`.

## Deploy (free hosting)

- **Production (example):** [sf-tennis-open.onrender.com](https://sf-tennis-open.onrender.com/)
- **GitHub + hosting:** **[GITHUB.md](./GITHUB.md)** — push to GitHub, then deploy (e.g. Render from your repo).
- **Platforms & details:** **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Render, GitHub Pages, notes on data and CORS.

## Build

```bash
npm run build
npm run preview
```

## How It Works

1. Share the link with participants
2. Each participant signs up with name, rating, and format (singles/doubles)
3. The draw auto-generates and updates live when 2+ participants have signed up
4. Seeding is by rating (higher = better seed)
5. Everyone visiting the URL sees the same live participants list and draw

---

Built for SF tennis tournaments 🎾
