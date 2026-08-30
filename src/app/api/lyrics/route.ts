import { NextResponse } from 'next/server';
import { getLyrics } from '@/lib/youtube';

interface LRCLibResult {
  id: number;
  trackName: string;
  artistName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

interface LrcLine {
  time: number; // seconds (fraction)
  text: string;
}

const LRCLIB_API_URL = process.env.LRCLIB_API_URL;
const LYRICS_USER_AGENT = process.env.LYRICS_USER_AGENT;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseLRC(lrc: string): LrcLine[] {
  if (!lrc) return [];
  const lineRegex = /\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  const lines: LrcLine[] = [];
  for (const rawLine of lrc.split(/\r?\n/)) {
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    lineRegex.lastIndex = 0;
    while ((match = lineRegex.exec(rawLine)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fractionRaw = match[3];
      let fraction = 0;
      if (fractionRaw) {
        fraction = parseInt(fractionRaw, 10) / Math.pow(10, fractionRaw.length);
      }
      timestamps.push(minutes * 60 + seconds + fraction);
    }
    if (timestamps.length === 0) continue;
    const text = rawLine.replace(lineRegex, '').trim();
    if (!text) continue;
    for (const t of timestamps) {
      lines.push({ time: t, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

async function searchLRCLib(
  trackName: string,
  artistName: string
): Promise<LRCLibResult | null> {
  const params = new URLSearchParams();
  params.set('track_name', trackName);
  if (artistName) params.set('artist_name', artistName);
  params.set('q', `${trackName} ${artistName}`.trim());

  const res = await fetch(`${LRCLIB_API_URL}/search?${params.toString()}`, {
    headers: { 'User-Agent': LYRICS_USER_AGENT ?? '' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const results: LRCLibResult[] = await res.json();

  const targetArtist = normalize(artistName);
  // Prefer a non-instrumental result whose artist matches, favouring synced lyrics.
  let best: LRCLibResult | null = null;
  for (const r of results) {
    if (r.instrumental) continue;
    const artistMatches = !targetArtist || normalize(r.artistName).includes(targetArtist);
    if (!artistMatches) continue;
    if (!best) {
      best = r;
      continue;
    }
    const score = (r.syncedLyrics ? 2 : 0) + (r.plainLyrics ? 1 : 0);
    const bestScore = (best.syncedLyrics ? 2 : 0) + (best.plainLyrics ? 1 : 0);
    if (score > bestScore) best = r;
  }
  return best;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const title = url.searchParams.get('title') ?? '';
  const artist = url.searchParams.get('artist') ?? '';

  if (!id) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 });
  }

  // Try LRCLib first for synced (karaoke) lyrics.
  if (title) {
    const lrclib = await searchLRCLib(title, artist);
    if (lrclib) {
      if (lrclib.syncedLyrics) {
        const lines = parseLRC(lrclib.syncedLyrics);
        if (lines.length > 0) {
          return NextResponse.json({ synced: true, lines });
        }
      }
      if (lrclib.plainLyrics) {
        return NextResponse.json({ synced: false, lyrics: lrclib.plainLyrics, source: `LRCLib · ${lrclib.artistName}` });
      }
    }
  }

  // Fallback: plain lyrics from YouTube Music.
  const youTubeLyrics = await getLyrics(id);
  if (youTubeLyrics) {
    return NextResponse.json({ synced: false, lyrics: youTubeLyrics.text, source: youTubeLyrics.source });
  }

  return NextResponse.json({ error: 'Lyrics not available' }, { status: 404 });
}
