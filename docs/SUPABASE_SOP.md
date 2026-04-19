# SOP: Store all tournament data in Supabase

**Purpose:** Persist participants, match results, and event planning in Supabase (Postgres) so data survives deploys, restarts, and disk wipes on hosts like Render.

**Audience:** You (or anyone operating the app).

**Prerequisites:** Supabase account (free tier is fine), Node 18+ for this repo, admin access to deployment env vars (e.g. Render).

---

## 1. Roles, keys, and security (read first)

### Where to find keys (Supabase Dashboard)

1. **Project Settings** (gear) → **API Keys** (or **Data API** → keys, depending on dashboard version).
2. **Project URL** — same area; looks like `https://YOUR_PROJECT_REF.supabase.co` → use as `SUPABASE_URL`.

Supabase now shows **two styles** of keys:

| UI label | Typical prefix | Maps to env var | Use |
|----------|----------------|-----------------|-----|
| **Publishable** key | `sb_publishable_...` | *(not for this Express backend)* | Browser / mobile **only** with RLS policies. |
| **Secret** key | `sb_secret_...` | **`SUPABASE_SERVICE_ROLE_KEY`** | **Your Node server** — privileged access (same role as legacy `service_role`). |

If you still see the **Legacy** section: use **`service_role`** (long JWT) as `SUPABASE_SERVICE_ROLE_KEY` — it’s the same privilege level as the new **Secret** key.

**Rules**

1. Put **`SUPABASE_SERVICE_ROLE_KEY` only on the server** (the **Secret** / `sb_secret_...` or legacy **service_role** value). Never commit it. Never expose it in the browser or GitHub Actions logs.
2. Prefer **RLS enabled with no policies** on these tables (see migration): only the service role can read/write; anon/authenticated users cannot touch data via Supabase’s REST API.
3. Your app’s **public HTTP API** (`/api/participants`, etc.) remains the contract; Supabase is an implementation detail behind Express.

---

## 2. One-time: Create project and schema

### 2.1 Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose region close to your app users (e.g. US West).
3. Set a strong database password; save it (needed for direct Postgres tools, not for `@supabase/supabase-js` with service role).

### 2.2 Apply database schema

1. In Supabase: **SQL Editor** → **New query**.
2. Paste the full contents of  
   `supabase/migrations/20250319120000_tournament_schema.sql`
3. **Run** the query. Confirm no errors.

**What you get**

| Table | Replaces |
|-------|-----------|
| `participants` | `server/participants.json` |
| `match_results` | `server/match-results.json` (`singles` / `doubles` maps) |
| `event_plan` | `server/event-plan.json` (single row `id = 1`, column `payload`) |

**Row shapes (for reference)**

- **participants:** `id` (uuid), `name`, `rating`, `type` (`singles`|`doubles`), `partner_name`, `partner_rating`, `created_at`, plus later migrations (e.g. `admin_seed_rank`, `admin_bracket_slot` for admin draw/waiting overrides — run every `.sql` in `supabase/migrations/` you have not applied yet, then `NOTIFY pgrst, 'reload schema';` if the API still reports a missing column)
- **match_results:** `draw_type` + `match_id` (composite PK), `winner_id`, `score`, `updated_at`
- **event_plan:** `id = 1`, `payload` (jsonb — same structure your admin UI saves today)

---

## 3. Environment configuration

### 3.1 Local development

1. Copy `.env.example` to `.env` if needed.
2. Add:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. Restart the server after changes.

### 3.2 Production (e.g. Render)

1. Dashboard → your Web Service → **Environment**.
2. Add the same two variables.
3. Redeploy so the new env is picked up.

### 3.3 Test that the app can reach Supabase

1. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
2. Run the API: `npm run dev:server` (or full `npm run dev`).
3. Open or curl the health endpoint:
   ```bash
   curl -s http://localhost:3001/api/health | jq
   ```
4. Check **`store`** and **`database`** in the JSON:

| `store` | Meaning |
|---------|---------|
| `"supabase"` | API reads/writes **Postgres** (`participants`, `match_results`, `event_plan`). |
| `"json"` | API uses **`server/*.json`** only — Supabase tables will stay empty no matter what you see in the UI. |

| `database` shape | Meaning |
|------------------|---------|
| `"configured": false` | Env vars missing for the health probe. |
| `"configured": true, "ok": true` | Supabase reachable; `participantCount` is rows in `participants`. |
| `"configured": true, "ok": false` | URL/key wrong or tables missing — see `error` (and `hint` if present). |

You can have **`database.ok: true`** but **`store: "json"`** if env wasn’t loaded when the process started — **restart the server** after fixing `.env`, or ensure both vars are set on your host (Render, etc.).

**Without the running app:** In Supabase → **Table Editor**, open `participants`. If the table is there and you can add a row manually, the database side is fine.

---

## 4. Application integration (done in this repo)

When **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** are both set, the server uses **Supabase** for all app data. Otherwise it uses **`server/*.json`** files.

| Module | Role |
|--------|------|
| `server/store.js` | Chooses Supabase vs JSON |
| `server/store-supabase.js` | Postgres access |
| `server/store-json.js` | File-based (same as before) |

The **frontend is unchanged**: it still calls `/api/participants`, `/api/match-results`, etc. The Express server reads/writes Supabase behind those routes.

**After turning on Supabase:** Existing JSON data is **not** copied automatically. Either run §5 (migrate), or start from an empty database.

**Verify:** `GET /api/health` → `"store": "supabase"` and `"database": { "ok": true, ... }`. Server logs on startup: `Data store: supabase`.

---

## 5. Migrating existing JSON data into Supabase

Do this **once** after schema exists and before cutting traffic to Supabase-only storage.

### 5.1 Export current files

From your machine (or server), copy:

- `server/participants.json`
- `server/match-results.json`
- `server/event-plan.json` (if present)

### 5.2 Participants

For each object in `participants` array, insert:

- `id`, `name`, `rating`, `type`, `partner_name`, `partner_rating`, `created_at`

You can use **SQL Editor** with generated `INSERT` statements, or a one-off script with `supabase-js` + service role.

### 5.3 Match results

For each key in `singles` and `doubles`, insert a row:

- `draw_type`: `'singles'` or `'doubles'`
- `match_id`: the object key (e.g. `r1-m1`)
- `winner_id`, `score` from `{ winnerId, score }`

### 5.4 Event plan

1. If `event-plan.json` is a non-empty object, run:

```sql
UPDATE public.event_plan
SET payload = '{"checklist":[], ...}'::jsonb,  -- paste full JSON as escaped jsonb
    updated_at = now()
WHERE id = 1;
```

Or use Table Editor → `event_plan` → edit `payload` as JSON.

### 5.5 Verify

- Row counts match expectations.
- Open admin UI: participants list, draws, event plan load correctly.
- Set a test match result and confirm row appears in `match_results`.

---

## 6. Operational procedures

### 6.1 Before an event

- [ ] Confirm prod has `SUPABASE_*` vars set and deploy is green.
- [ ] Optional: duplicate project or take backup (section 6.4) if this is a high-stakes tournament.

### 6.2 During the event

- Data updates through the app = writes to Supabase. No manual steps unless fixing bad data.

### 6.3 After an event

- [ ] **Backup** (6.4) if you want an archive.
- [ ] Optional: clear `participants` / `match_results` / reset `event_plan` for the next event (via SQL or admin flows if you add “reset tournament”).

### 6.4 Backups (Supabase)

1. Dashboard → **Database** → **Backups** (schedule/plan depends on plan tier).
2. For ad-hoc export: **Table Editor** → export tables, or use **SQL** + copy results, or Postgres `pg_dump` with connection string from **Project Settings → Database**.

### 6.5 Incident: wrong or lost data

1. Check **Database → Logs** / **API logs** if applicable.
2. Restore from latest backup or re-import from a saved JSON export if you kept one.
3. Do not rotate `service_role` key unless leaked; if rotated, update all server envs immediately.

---

## 7. Troubleshooting

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| **Supabase `participants` empty but UI shows people** | Server is using **JSON**, not Supabase | Call `GET /api/health`. If `"store": "json"`, the API is writing to `server/participants.json`. Set both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, **restart the server**, confirm `"store": "supabase"`. Old JSON data is **not** copied automatically (see §5). |
| **Table empty after enabling Supabase** | No signups since switch | Add a test participant in the app, or import JSON (§5). |
| 401 / empty from Supabase in code | Wrong key or URL | Verify `SUPABASE_URL` and secret / **service_role** key (no trailing spaces). |
| “relation does not exist” | Migration not applied | Re-run `20250319120000_tournament_schema.sql`. |
| Data missing after deploy (JSON mode) | Still on file store + ephemeral disk | Set Supabase env on the host (e.g. Render) and redeploy. |
| RLS / permission errors with anon key | Using wrong key in server | Server must use **secret / service_role**, not **anon** / publishable. |

---

## 8. Quick reference — file → table mapping

| Current file | Table | Notes |
|--------------|--------|--------|
| `participants.json` → `.participants[]` | `public.participants` | One row per signup |
| `match-results.json` → `.singles`, `.doubles` | `public.match_results` | One row per match id per draw type |
| `event-plan.json` (whole doc) | `public.event_plan.payload` | Single row `id = 1` |

---

## Related docs

- [DEPLOYMENT.md](../DEPLOYMENT.md) — Render / hosting
- [GITHUB.md](../GITHUB.md) — GitHub + deploy flow
