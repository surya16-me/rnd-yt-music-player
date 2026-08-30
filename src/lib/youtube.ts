import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { Innertube, UniversalCache } from 'youtubei.js';
import { ArtistInfo, Track } from '@/types/music';
import { formatTime } from '@/lib/formatTime';

const execFileAsync = promisify(execFile);

const YTDLP_BIN =
  process.env.YTDLP_PATH ||
  ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp'].find((p) => existsSync(p)) ||
  'yt-dlp';

const streamUrlCache = new Map<string, { url: string; expires: number }>();

interface RawThumb {
  url?: string;
}

interface RawArtistRef {
  name?: string;
  channel_id?: string;
}

interface RawSong {
  id?: string;
  title?: string | { text?: string };
  artists?: RawArtistRef[];
  author?: { name?: string; channel_id?: string };
  album?: string | { name?: string };
  thumbnails?: RawThumb[];
  thumbnail?: { contents?: RawThumb[] };
  duration?: { seconds?: number; text?: string };
}

interface RawVideo {
  id?: string;
  title?: string | { text?: string };
  author?: { name?: string; channel_id?: string };
  thumbnails?: RawThumb[];
  duration?: { seconds?: number; text?: string };
}

interface RawShelfSection {
  type?: string;
  title?: string | { text?: string };
  endpoint?: { payload?: { browseId?: string } };
  contents?: RawSong[];
}

interface RawSectionList {
  contents?: RawShelfSection[];
}

interface RawArtistHeader {
  thumbnail?: { contents?: RawThumb[] };
}

// Google-hosted thumbnail URLs embed a size param and can be re-served larger
function upgradeThumbnail(url: string): string {
  if (!/yt3\.googleusercontent\.com|yt3\.ggpht\.com|lh3\.googleusercontent\.com/.test(url)) {
    return url;
  }
  return url
    .replace(/=w(\d+)-h(\d+)/, (_m, w: string, h: string) => {
      const nw = Math.max(parseInt(w, 10), 480);
      const nh = Math.max(parseInt(h, 10), 480);
      return `=w${nw}-h${nh}`;
    })
    .replace(/=s(\d+)/, (_m, s: string) => `=s${Math.max(parseInt(s, 10), 480)}`);
}

let ytInstance: Innertube | null = null;

export async function getInnertube(): Promise<Innertube> {
  if (!ytInstance) {
    ytInstance = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
  }
  return ytInstance;
}

export async function searchTracks(query: string): Promise<Track[]> {
  try {
    const yt = await getInnertube();
    const searchResults = await yt.music.search(query, { type: 'song' });
    const songs = (searchResults.songs?.contents || []) as unknown as RawSong[];

    if (songs.length > 0) {
      return songs
        .filter((song) => song.id)
        .map((song) => {
        const thumbnail = upgradeThumbnail(
          song.thumbnails?.[song.thumbnails.length - 1]?.url ||
            song.thumbnail?.contents?.[0]?.url ||
            `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`
        );

        return {
          id: song.id || '',
          title: typeof song.title === 'string' ? song.title : song.title?.text || 'Unknown Title',
          artist: song.artists?.map((a: RawArtistRef) => a.name).join(', ') || song.author?.name || 'Unknown Artist',
          artistId: song.artists?.[0]?.channel_id,
          album: typeof song.album === 'string' ? song.album : song.album?.name || '',
          thumbnail,
          duration: song.duration?.seconds || 0,
          durationText: song.duration?.text || '0:00',
        };
      });
    }

    // Fallback to standard YouTube search if YT Music returns empty
    const generalSearch = await yt.search(query);
    const videos = (generalSearch.videos || []) as unknown as RawVideo[];
    return videos
      .filter((v) => v.id)
      .map((v) => {
      const thumbnail = upgradeThumbnail(
        v.thumbnails?.[v.thumbnails.length - 1]?.url ||
          `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`
      );

      return {
        id: v.id || '',
        title: typeof v.title === 'string' ? v.title : v.title?.text || 'Unknown Title',
        artist: v.author?.name || 'YouTube Music',
        artistId: v.author?.channel_id,
        album: '',
        thumbnail,
        duration: v.duration?.seconds || 0,
        durationText: v.duration?.text || '0:00',
      };
    });
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

export async function getTrendingTracks(): Promise<Track[]> {
  try {
    // Default search for popular/trending hits
    return await searchTracks('Top Hits Indonesia 2026');
  } catch (error) {
    console.error('Error getting trending tracks:', error);
    return [];
  }
}

export async function getRelatedTracks(videoId: string): Promise<Track[]> {
  try {
    const yt = await getInnertube();
    const sectionList = await yt.music.getRelated(videoId);
    const sections = (sectionList as unknown as RawSectionList).contents || [];

    let songs: RawSong[] = [];
    for (const section of sections) {
      if (section.type === 'MusicCarouselShelf') {
        const items = ((section.contents || []) as RawSong[]).filter(
          (song) => song.id && Array.isArray(song.artists) && song.artists.length > 0
        );
        if (items.length > 0) {
          songs = items;
          break;
        }
      }
    }

    return songs.map((song) => {
      const thumbnail = upgradeThumbnail(
        song.thumbnail?.contents?.[0]?.url ||
          song.thumbnails?.[song.thumbnails.length - 1]?.url ||
          `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`
      );

      return {
        id: song.id || '',
        title: typeof song.title === 'string' ? song.title : song.title?.text || 'Unknown Title',
        artist: song.artists?.map((a: RawArtistRef) => a.name).join(', ') || song.author?.name || 'Unknown Artist',
        artistId: song.artists?.[0]?.channel_id,
        album: typeof song.album === 'string' ? song.album : song.album?.name || '',
        thumbnail,
        duration: song.duration?.seconds || 0,
        durationText: song.duration?.text || '',
      };
    });
  } catch (error) {
    console.error('Error fetching related tracks:', error);
    return [];
  }
}

export async function getArtistTracks(
  artistId: string | null,
  artistName: string
): Promise<ArtistInfo> {
  let name = artistName;
  let thumbnail = '';
  let topSongs: { id: string; title: string; duration: number; album: string }[] = [];

  // Authoritative songs from the artist page when we have a channel id
  if (artistId) {
    try {
      const yt = await getInnertube();
      const artist = await yt.music.getArtist(artistId);
      name =
        typeof artist.header?.title === 'string'
          ? artist.header.title
          : artist.header?.title?.text || artistName;
      const header = artist.header as unknown as RawArtistHeader | undefined;
      thumbnail = upgradeThumbnail(
        header?.thumbnail?.contents?.[header.thumbnail.contents.length - 1]?.url || ''
      );
      const sections = (artist.sections || []) as unknown as RawShelfSection[];
      const shelf = sections.find((s) => {
        const shelfTitle = typeof s.title === 'string' ? s.title : s.title?.text;
        return s.type === 'MusicShelf' && shelfTitle === 'Top songs';
      });
      topSongs = await extractArtistSongs(yt, shelf);
    } catch (error) {
      console.error(`Error fetching artist ${artistId}:`, error);
    }
  }

  // Fallback when the artist page has no usable song list: search by name,
  // keeping only this artist's own tracks
  if (topSongs.length === 0) {
    const results = await searchTracks(name);
    const normalized = name.trim().toLowerCase();
    const artistOnly = results.filter(
      (t) => t.artist.split(',')[0].trim().toLowerCase() === normalized
    );
    const tracks = (artistOnly.length ? artistOnly : results).map((t) => ({
      ...t,
      thumbnail: `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`,
    }));
    return { name, thumbnail, tracks };
  }

  const tracks: Track[] = topSongs.map((song) => ({
    id: song.id,
    title: song.title,
    artist: name,
    artistId: artistId || undefined,
    album: song.album || '',
    thumbnail: `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`,
    duration: song.duration || 0,
    durationText: song.duration ? formatTime(song.duration) : '',
  }));

  return { name, thumbnail, tracks };
}

async function extractArtistSongs(
  yt: Innertube,
  shelf: RawShelfSection | undefined
): Promise<{ id: string; title: string; duration: number; album: string }[]> {
  // The "Top songs" shelf links to a playlist holding the full artist catalog
  const browseId = shelf?.endpoint?.payload?.browseId;
  if (browseId) {
    try {
      const playlist = await yt.music.getPlaylist(browseId);
      const items = ((playlist.contents || []) as RawSong[]).filter((song) => song.id);
      if (items.length > 0) {
        return items.map((song: RawSong) => ({
          id: song.id || '',
          title: typeof song.title === 'string' ? song.title : song.title?.text || 'Unknown Title',
          duration: song.duration?.seconds || 0,
          album: typeof song.album === 'string' ? song.album : song.album?.name || '',
        }));
      }
    } catch (error) {
      console.error('Error expanding artist top songs playlist:', error);
    }
  }

  // Fallback: the 5 songs listed directly in the shelf
  return (shelf?.contents || [])
    .filter((song: RawSong) => song.id)
    .map((song: RawSong) => ({
    id: song.id || '',
    title: typeof song.title === 'string' ? song.title : song.title?.text || 'Unknown Title',
    duration: song.duration?.seconds || 0,
    album: '',
  }));
}

export async function getStreamUrl(videoId: string): Promise<string | null> {
  const cached = streamUrlCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  const ytDlpUrl = await getYtDlpStreamUrl(videoId);
  if (ytDlpUrl) {
    cacheStreamUrl(videoId, ytDlpUrl);
    return ytDlpUrl;
  }

  return getInnertubeStreamUrl(videoId);
}

async function getYtDlpStreamUrl(videoId: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      YTDLP_BIN,
      [
        '--quiet',
        '--no-warnings',
        '--no-playlist',
        '--get-url',
        '-f',
        'bestaudio[ext=m4a]/bestaudio',
        videoId,
      ],
      { timeout: 20000, maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = stdout.trim().split('\n').filter(Boolean);
    const url = lines[lines.length - 1]?.trim();
    return url && url.startsWith('http') ? url : null;
  } catch (error) {
    console.error(`Error getting stream URL via yt-dlp for ${videoId}:`, error);
    return null;
  }
}

function cacheStreamUrl(videoId: string, url: string) {
  let expires = Date.now() + 60 * 60 * 1000;
  try {
    const expireSec = new URL(url).searchParams.get('expire');
    if (expireSec) {
      const ms = Number(expireSec) * 1000;
      if (!Number.isNaN(ms) && ms > Date.now()) {
        expires = ms - 60 * 1000;
      }
    }
  } catch {}
  streamUrlCache.set(videoId, { url, expires });
}

async function getInnertubeStreamUrl(videoId: string): Promise<string | null> {
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId, { client: 'IOS' });
    const formats = info.streaming_data?.adaptive_formats || [];
    const audioFormats = formats.filter((f) => f.has_audio && !f.has_video);

    if (audioFormats.length > 0 && audioFormats[0].url) {
      return audioFormats[0].url;
    }

    // Fallback to Android client or standard formats
    const infoAndroid = await yt.getInfo(videoId, { client: 'ANDROID' });
    const androidFormats = infoAndroid.streaming_data?.adaptive_formats || [];
    const audioAndroid = androidFormats.filter((f) => f.has_audio && !f.has_video);
    if (audioAndroid.length > 0 && audioAndroid[0].url) {
      return audioAndroid[0].url;
    }

    return null;
  } catch (error) {
    console.error(`Error getting stream URL for ${videoId}:`, error);
    return null;
  }
}
