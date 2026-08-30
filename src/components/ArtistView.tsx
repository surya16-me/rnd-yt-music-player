'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, User, Mic2, Music } from 'lucide-react';
import { ArtistInfo } from '@/types/music';
import { usePlayerStore } from '@/store/usePlayerStore';
import TrackRow from './TrackRow';

interface ArtistViewProps {
  artistId?: string;
  artistName: string;
  onBack: () => void;
  onOpenArtist: (name: string, artistId?: string) => void;
}

export default function ArtistView({
  artistId,
  artistName,
  onBack,
  onOpenArtist,
}: ArtistViewProps) {
  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    let cancelled = false;
    async function loadArtist() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ name: artistName });
        if (artistId) params.set('id', artistId);
        const res = await fetch(`/api/artist?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setArtist(data);
      } catch (err) {
        console.error('Failed to load artist:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadArtist();
    return () => {
      cancelled = true;
    };
  }, [artistId, artistName]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-end gap-6 p-6 rounded-2xl bg-white/5">
            <div className="w-44 h-44 rounded-full bg-zinc-800 animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-64 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-850/50 rounded-md animate-pulse" />
          ))}
        </div>
      ) : artist && artist.tracks.length > 0 ? (
        <>
          {/* Header banner */}
          <div className="flex items-end gap-4 sm:gap-6 bg-linear-to-t from-[#121212] to-emerald-900/40 p-4 sm:p-6 rounded-2xl border border-emerald-500/10">
            <div className="w-24 h-24 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shadow-2xl shrink-0">
              {artist.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={artist.thumbnail}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 sm:w-20 sm:h-20 text-zinc-600" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1">
                <Mic2 className="w-3.5 h-3.5" />
                Artis
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mt-1 mb-2 truncate">
                {artist.name}
              </h1>
              <p className="text-xs text-zinc-300">{artist.tracks.length} lagu</p>
            </div>
          </div>

          {/* Play all */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => playTrack(artist.tracks[0], artist.tracks)}
              className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
              aria-label="Putar semua"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>
            <span className="text-sm text-zinc-400">Putar semua lagu dari {artist.name}</span>
          </div>

          {/* Track list */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Lagu Populer</h3>
            <div className="bg-black/30 rounded-lg p-2 border border-white/5 divide-y divide-white/5">
              {artist.tracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  trackList={artist.tracks}
                  onOpenArtist={onOpenArtist}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-zinc-500">
          <Music className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-base font-semibold text-zinc-400">Lagu artis tidak ditemukan</p>
          <p className="text-xs text-zinc-600 mt-1">Coba klik artis lain atau cari di pencarian</p>
        </div>
      )}
    </div>
  );
}
