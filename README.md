# Spotify YT Player

A Spotify-style music player web app built with **Next.js** (App Router) that
streams audio directly from **YouTube Music** — no external binary required.

## Features

- **Full song streaming from YouTube Music** using a pure-Node **Proof of Origin
  (PO token)** extractor. This unlocks the *entire* audio file (not just the
  ~384 KB first-chunk that anonymous clients get), so the app can run on
  serverless/edge runtimes without `yt-dlp`.
- Search music, browse trending tracks, and explore artist pages.
- Click a track to play it and auto-build a relevant follow-up queue from
  YouTube's "Up Next" panel.
- Player with play/pause, seek, shuffle, loop, volume, and an "Up Next" queue
  drawer.
- Like songs, with history, volume, and toggle preferences persisted locally
  (Zustand `persist`).
- Custom favicon.

## Tech Stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19                  |
| Styling   | Tailwind CSS v4                                    |
| State     | Zustand v5 (client player state + persistence)     |
| YouTube   | `youtubei.js` v18 (Innertube client)               |
| PO tokens | `bgutils-js` (BotGuard + WebPoMinter) + `jsdom`    |
| Icons     | `lucide-react`                                     |
| Language  | TypeScript (strict, no `any`)                      |

## Getting Started

### Prerequisites

- Node.js 18+ (for Next.js 16)
- npm

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

| Variable             | Required | Description                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `YOUTUBE_REQUEST_KEY` | No       | Request key for YouTube's `/youtubei/v1/att` endpoint (a public value). Has a safe hard-coded default. |

Nothing else is required to run — no API keys, no external services.

## How streaming works

YouTube limits anonymous stream URLs to the first few hundred KB with a `403`
beyond that. To serve a full song, the app mints a **Proof of Origin (PO)
token** bound to each video and appends it to the stream URL as `?pot=...`.

Flow (see `src/lib/potoken.ts`):

1. Load a headless YouTube page (via `jsdom`) and the BotGuard interpreter.
2. Run the BotGuard attestation to obtain an **Integrity Token**.
3. Build a **WebPoMinter** from it (cached for the process lifetime).
4. For each video, mint a content-bound token and append it to the deciphered
   audio URL.

The `/api/stream` route then **proxies ranged requests** against that URL, so
the browser can seek anywhere in the file. This replaces an older approach that
shelled out to the `yt-dlp` binary.

## API Routes

| Route             | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `GET /api/search?q=` | Search tracks (YouTube Music search).                 |
| `GET /api/trending`  | Trending music feed.                                  |
| `GET /api/related?id=` | Up-Next/related tracks for a video, for auto-queue. |
| `GET /api/artist?id=&name=` | Artist info + top tracks.                       |
| `GET /api/stream?id=` | Proxied ranged audio stream (supports `Range`).      |

## Project Structure

```
src/
├── app/
│   ├── api/               # Route handlers (search, trending, related, artist, stream)
│   └── page.tsx           # Main app client page
├── components/            # UI (Sidebar, MainView, ArtistView, PlayerBar, QueueDrawer, ...)
│   └── AudioEngine.tsx    # <audio> playback + pause/resume logic
├── lib/
│   ├── youtube.ts         # Innertube client + search/stream/related/artist logic
│   ├── potoken.ts         # PO-token minter (BotGuard + WebPoMinter)
│   └── formatTime.ts      # Utility helpers
├── store/
│   └── usePlayerStore.ts  # Zustand player store (queue, likes, persistence)
└── types/
    └── music.ts           # Shared Track/Artist types
```

## Development / Branching

This project is developed on feature branches and merged into `main` via pull
requests. There is a long-running R&D branch (`rnd/po-token`) for the PO-token
work; `main` is the stable integration point. Keep changes on a feature branch,
then open a PR to `main`.

## Scripts

| Command              | Description        |
| -------------------- | ------------------ |
| `npm run dev`        | Start dev server   |
| `npm run build`      | Production build   |
| `npm run start`      | Start production server |
| `npm run lint`       | Run ESLint         |
