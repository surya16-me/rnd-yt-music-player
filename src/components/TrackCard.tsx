'use client';

import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Track } from '@/types/music';
import { usePlayerStore } from '@/store/usePlayerStore';
import { onThumbError } from '@/lib/img';

interface TrackCardProps {
  track: Track;
  trackList?: Track[];
  onOpenArtist?: (name: string, artistId?: string) => void;
}

export default function TrackCard({ track, trackList, onOpenArtist }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrackWithRelated, togglePlay } = usePlayerStore();
  const isCurrent = currentTrack?.id === track.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrackWithRelated(track, trackList);
    }
  };

  return (
    <div
      onClick={() => isCurrent ? togglePlay() : playTrackWithRelated(track, trackList)}
      className="group relative bg-[#181818] hover:bg-[#282828] p-4 rounded-lg transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-between"
    >
      <div className="relative aspect-square w-full mb-4 overflow-hidden rounded-md bg-zinc-800 shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => onThumbError(e, track.id)}
        />

        {/* Floating Spotify Play Button */}
        <button
          onClick={handlePlay}
          className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 flex items-center justify-center text-black shadow-xl shadow-black/50 transition-all duration-300 ${
            isCurrent
              ? 'opacity-100 translate-y-0'
              : 'opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0'
          }`}
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-black text-black" />
          ) : (
            <Play className="w-5 h-5 fill-black text-black ml-0.5" />
          )}
        </button>
      </div>

      <div className="space-y-1">
        <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>
          {track.title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenArtist?.(track.artist, track.artistId);
          }}
          className="block text-xs text-zinc-400 truncate hover:underline text-left"
        >
          {track.artist}
        </button>
      </div>
    </div>
  );
}
