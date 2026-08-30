# LCFA3 — Lastik Caller

A full-stack web app for browsing **Last.fm** artist data. The backend pulls live
stats from the Last.fm API, stores them in PostgreSQL, and exposes them through a
FastAPI-driven frontend.

---

## Key Features

### 🎵 Artist Management
- **Pull an artist from Last.fm** — add any artist by name; the backend calls
  `artist.getInfo` and stores `listeners`, `scrobbles`, and a computed
  `playcount / listeners` ratio.
- **Upsert behavior** — re-adding an existing artist updates stats in place
  (PostgreSQL `INSERT ... ON CONFLICT DO UPDATE`), with a unique constraint on the name.
- **Sortable artist table** — sort by any field (`id`, `name`, `listeners`,
  `scrobbles`, `ratio`, `created_at`, `updated_at`) in ascending/descending order,
  both via API query params (`sort_by`, `order`) and by clicking column headers
  in the UI.
- **Delete artists** — per-row delete with a hover-revealed button and a
  confirmation-free UX; newly added rows are highlighted.

### 🏷️ Artist Tags
- **Tag explorer** — look up an artist and see their top tags straight from
  Last.fm (`artist.getTopTags`), with low-count tags (< 20) filtered out.
- **Ignore tags** — maintain a persistent list of ignored tags; ignored tags are
  filtered out of tag results.
- **One-click ignore from results** — ignore a tag directly from the search
  results table, or add/remove tags manually in the dedicated ignored-tags section.

### 📅 User Stats
- **Last week chart** — enter any Last.fm username to fetch their weekly artist
  chart (`user.getWeeklyArtistChart`) showing artist → playcount for the past week.

### 🛠️ Backend Quality-of-Life
- **Structured logging** — separate `lcfa3.app` and `lcfa3.db` loggers; every
  request (with response time) and every DB query (with execution time) is logged.
- **Request timing middleware** — per-request elapsed-time logging.
- **Custom API docs** — Swagger UI and ReDoc served from self-hosted static route
  handlers (no CDN dependencies).
- **Health check** — `GET /health` endpoint for readiness probes.
- **CORS-enabled** — permissive CORS for local development.

### 📦 Infrastructure
- **Docker Compose** — one command brings up the API, PostgreSQL 17, and the
  React dev server.
- **Alembic migrations** — versioned schema changes (artists table, unique name
  constraint, ignored tags table).
- **Fast ORJSON responses** — API uses `ORJSONResponse` by default.

---

## Tech Stack

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Backend    | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async), asyncpg        |
| Database   | PostgreSQL 17, Alembic migrations                                       |
| Frontend   | React 18, TypeScript, Vite                                              |
| External   | Last.fm API (`ws.audioscrobbler.com`) via `httpx`                       |
| Infra      | Docker, Docker Compose                                                  |

---

## Project Structure

```
.
├── api/                # API routers (artists, user stats)
│   └── api_v1/
├── frontend/           # React + TypeScript + Vite app
│   └── src/            # Artists, Artist Tags, Last Week pages
├── lastfm/             # Last.fm API client helpers
├── models/             # SQLAlchemy models (Artist, IgnoredTag)
├── schemas/            # Pydantic schemas
├── alembic/            # DB migrations
├── config.py           # Pydantic-settings app config
├── create_fastapi_app.py
├── database.py         # Async engine/session + query logging
├── logging_config.py   # Logging setup
└── main.py             # App entrypoint
```

---

## Getting Started

**Docker Compose** (recommended):

```bash
docker compose up --build
```

This starts:
- Backend API → `http://localhost:8000` (docs at `/docs`)
- Frontend → `http://localhost:5173`
- PostgreSQL → `localhost:5432`

Run Alembic migrations against the database:

```bash
# from a poetry/shell env with access to the DB
alembic upgrade head
```

---

## API Overview

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint                          | Description                             |
|--------|-----------------------------------|-----------------------------------------|
| GET    | `/health`                         | Health check                            |
| GET    | `/api/v1/artists`                 | List artists (`sort_by`, `order`)       |
| POST   | `/api/v1/artists`                 | Add/upsert an artist from Last.fm name  |
| DELETE | `/api/v1/artists/{artist_id}`     | Delete an artist                        |
| GET    | `/api/v1/artists/tags?name=...`   | Top Last.fm tags for an artist          |
| GET    | `/api/v1/artists/tags/ignored`    | List ignored tags                       |
| POST   | `/api/v1/artists/tags/ignored`    | Add an ignored tag                      |
| DELETE | `/api/v1/artists/tags/ignored/{tag_id}` | Remove an ignored tag            |
| POST   | `/api/v1/user_stats/last_week`    | Last-week artist chart for a username   |

Interactive docs: `http://localhost:8000/docs` (Swagger UI) and
`http://localhost:8000/redoc`.