import { NextRequest, NextResponse } from 'next/server';
import { getArtistTracks } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const name = searchParams.get('name');

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Missing artist name' }, { status: 400 });
  }

  try {
    const artist = await getArtistTracks(id || null, name);
    return NextResponse.json(artist);
  } catch (error) {
    console.error('API /api/artist error:', error);
    return NextResponse.json({ error: 'Failed to fetch artist' }, { status: 500 });
  }
}
