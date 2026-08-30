import { NextRequest, NextResponse } from 'next/server';
import { getRelatedTracks } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id || id.trim() === '') {
    return NextResponse.json({ error: 'Missing track id' }, { status: 400 });
  }

  try {
    const tracks = await getRelatedTracks(id);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('API /api/related error:', error);
    return NextResponse.json({ error: 'Failed to fetch related tracks' }, { status: 500 });
  }
}