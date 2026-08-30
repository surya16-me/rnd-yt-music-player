export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  thumbnail: string;
  duration?: number; // in seconds
  durationText?: string;
}

export interface ArtistInfo {
  name: string;
  thumbnail: string;
  tracks: Track[];
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  tracks: Track[];
}
