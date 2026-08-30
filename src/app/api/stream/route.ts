import { NextRequest, NextResponse } from 'next/server';
import { getStreamUrl } from '@/lib/youtube';

const IOS_UA =
  'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)';
const CHUNK_SIZE = 384 * 1024;
const TOTAL_TTL = 6 * 60 * 60 * 1000;

const totalCache = new Map<string, { total: number; expires: number }>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 });
  }

  try {
    const streamUrl = await getStreamUrl(id);
    if (!streamUrl) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const totalSize = await getTotalSize(id, streamUrl);
    const rangeHeader = request.headers.get('range');
    const range = resolveRange(rangeHeader, totalSize);

    if (!range) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${totalSize}` } });
    }

    const ytResponse = await fetch(streamUrl, {
      headers: {
        'User-Agent': IOS_UA,
        Range: `bytes=${range.start}-${range.end}`,
      },
    });

    if (!ytResponse.ok && ytResponse.status !== 206) {
      return NextResponse.json(
        { error: 'Failed to fetch audio stream from source' },
        { status: ytResponse.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', ytResponse.headers.get('content-type') || 'audio/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');

    if (ytResponse.headers.has('content-length')) {
      responseHeaders.set('Content-Length', ytResponse.headers.get('content-length')!);
    }
    if (ytResponse.headers.has('content-range')) {
      responseHeaders.set('Content-Range', ytResponse.headers.get('content-range')!);
    }
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(ytResponse.body, {
      status: ytResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API /api/stream error:', error);
    return NextResponse.json({ error: 'Internal stream error' }, { status: 500 });
  }
}

async function getTotalSize(videoId: string, streamUrl: string): Promise<number | null> {
  const cached = totalCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    return cached.total;
  }

  const probe = await fetch(streamUrl, {
    headers: { 'User-Agent': IOS_UA, Range: 'bytes=0-0' },
  });
  const contentRange = probe.headers.get('content-range');
  const total = contentRange ? Number(contentRange.split('/')[1]) : NaN;

  if (probe.ok && !Number.isNaN(total)) {
    totalCache.set(videoId, { total, expires: Date.now() + TOTAL_TTL });
    return total;
  }
  return null;
}

function resolveRange(
  range: string | null,
  totalSize: number | null
): { start: number; end: number } | null {
  const last = totalSize !== null ? totalSize - 1 : Number.MAX_SAFE_INTEGER;
  const clamp = (start: number, requestedEnd: number) => ({
    start,
    end: Math.min(requestedEnd, last),
  });

  if (range) {
    const closed = /^bytes=(\d+)-(\d+)$/.exec(range);
    if (closed) return clamp(parseInt(closed[1], 10), parseInt(closed[2], 10));

    const open = /^bytes=(\d+)-$/.exec(range);
    if (open) {
      const start = parseInt(open[1], 10);
      return clamp(start, start + CHUNK_SIZE - 1);
    }

    const suffix = /^bytes=-(\d+)$/.exec(range);
    if (suffix) {
      const n = parseInt(suffix[1], 10);
      return clamp(Math.max(last - n + 1, 0), last);
    }
  }

  return clamp(0, CHUNK_SIZE - 1);
}
