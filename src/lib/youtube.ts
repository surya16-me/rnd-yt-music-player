import { Innertube, UniversalCache } from 'youtubei.js';
import { ArtistInfo, Track } from '@/types/music';
import { formatTime } from '@/lib/formatTime';
import { getPoToken } from '@/lib/potoken';

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

interface RawUpNextVideo {
  video_id?: string;
  title?: string | { text?: string };
  authors?: RawArtistRef[];
  artists?: RawArtistRef[];
  author?: string;
  thumbnail?: RawThumb[];
  duration?: { seconds?: number; text?: string };
}

interface RawShelfSection {
  type?: string;
  title?: string | { text?: string };
  endpoint?: { payload?: { browseId?: string } };
  contents?: RawSong[];
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

// Pick a usable thumbnail URL. youtubei.js may surface `maxresdefault.jpg`,
// which 404s for many videos, so swap it for the always-available `hqdefault`.
function resolveThumbnail(thumbnails: RawThumb[] | undefined, videoId: string): string {
  let url = '';
  for (const t of thumbnails || []) {
    if (t.url) url = t.url; // last non-empty wins = largest
  }
  if (!url) url = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (/\/maxresdefault\.jpg/.test(url)) {
    url = url.replace(/\/maxresdefault\.jpg/, '/hqdefault.jpg');
  }
  return upgradeThumbnail(url);
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
        const thumbnail = resolveThumbnail(song.thumbnails || song.thumbnail?.contents, song.id || '');

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
      const thumbnail = resolveThumbnail(v.thumbnails, v.id || '');

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
    // "Up next" panel is purpose-built for continuing a queue from the current
    // song, which gives a more relevant/consecutive set than the generic shelf.
    const panel = await yt.music.getUpNext(videoId);
    const items = panel.contents || [];

    const tracks: Track[] = [];
    for (const raw of items) {
      // Wrapped items carry the actual video on `.primary`
      const candidate = raw as RawUpNextVideo & { primary?: RawUpNextVideo | null };
      const video: RawUpNextVideo | null | undefined =
        candidate.primary ? candidate.primary : candidate;

      if (!video?.video_id) continue;

      const artists = (video.artists || [])
        .map((a: RawArtistRef) => a.name)
        .filter(Boolean);
      if (artists.length === 0) continue;

      const thumbnail = resolveThumbnail(video.thumbnail, video.video_id);

      tracks.push({
        id: video.video_id,
        title: typeof video.title === 'string' ? video.title : video.title?.text || 'Unknown Title',
        artist: artists.join(', ') || video.author || 'Unknown Artist',
        artistId: video.artists?.[0]?.channel_id,
        album: '',
        thumbnail,
        duration: video.duration?.seconds || 0,
        durationText: video.duration?.text || '',
      });
    }

    return tracks;
  } catch (error) {
    console.error('Error fetching related tracks:', error);
    return [];
  }
}

export async function getLyrics(videoId: string): Promise<{ text: string; source?: string } | null> {
  try {
  const yt = await getInnertube();
  const shelf = await yt.music.getLyrics(videoId);
  if (!shelf) return null;
  const text = shelf.description?.text?.trim();
  if (!text) return null;
  return {
    text,
    source: shelf.footer?.text || undefined,
  };
  } catch {
    // No lyrics available for this video (getLyrics throws when the tab is missing)
    return null;
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

  // Pure-Node PO token (WebPO) extractor, yielding a full stream without
  // relying on any external binary.
  const poTokenUrl = await getInnertubeStreamUrl(videoId);
  if (poTokenUrl) {
    cacheStreamUrl(videoId, poTokenUrl);
    return poTokenUrl;
  }

  return null;
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
  // Prefer the WebPO (Proof of Origin) path: mint a content-bound token and
  // append it as ?pot= so YouTube lets us stream the FULL audio file.
  try {
    const [poToken, yt] = await Promise.all([getPoToken(videoId), getInnertube()]);
    if (poToken) {
      // Attach the PO token to the player request itself. From datacenter IPs
      // (Vercel) YouTube withholds streaming_data unless a valid content-bound
      // PO token is sent via serviceIntegrityDimensions.poToken.
      const info = await yt.getBasicInfo(videoId, {
        client: 'YTMUSIC',
        po_token: poToken,
      });
      const format = info.chooseFormat({ quality: 'best', type: 'audio' });
      if (format?.has_audio) {
        const decodedUrl = await format.decipher(yt.session.player);
        if (decodedUrl) {
          const url = new URL(decodedUrl);
          url.searchParams.set('pot', poToken);
          return url.toString();
        }
      }
    }
  } catch (error) {
    console.error(`Error getting WebPO stream URL for ${videoId}:`, error);
  }

  // Fallback: legacy clients (limited to ~384KB without a PO token)
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId, { client: 'IOS' });
    const formats = info.streaming_data?.adaptive_formats || [];
    const audioFormats = formats.filter((f) => f.has_audio && !f.has_video);

    if (audioFormats.length > 0 && audioFormats[0].url) {
      return audioFormats[0].url;
    }
  } catch (error) {
    console.error(`Error getting stream URL for ${videoId}:`, error);
    return null;
  }

  return null;
}
