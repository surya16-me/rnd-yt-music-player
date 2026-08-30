import { NextResponse } from 'next/server';
import { getTrendingTracks } from '@/lib/youtube';

export async function GET() {
  try {
    const tracks = await getTrendingTracks();
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('API /api/trending error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending tracks' }, { status: 500 });
  }
}
