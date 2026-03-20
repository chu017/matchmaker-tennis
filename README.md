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

## Deploy (free hosting)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for deploying to **Render** (recommended) or **GitHub Pages**.

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
