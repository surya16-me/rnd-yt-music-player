'use client';

import React from 'react';
import { Play, Pause, Heart, Plus, Volume2 } from 'lucide-react';
import { Track } from '@/types/music';
import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime } from '@/lib/formatTime';

interface TrackRowProps {
  track: Track;
  index: number;
  trackList?: Track[];
  onOpenArtist?: (name: string, artistId?: string) => void;
}

export default function TrackRow({ track, index, trackList, onOpenArtist }: TrackRowProps) {
  const {
    currentTrack,
    isPlaying,
    playTrackWithRelated,
    togglePlay,
    likedTrackIds,
    toggleLike,
    addToQueue,
  } = usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTrackIds.includes(track.id);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrackWithRelated(track, trackList);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group grid grid-cols-12 items-center px-4 py-2.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-sm select-none ${
        isCurrent ? 'bg-white/10 text-[#1DB954]' : 'text-zinc-300'
      }`}
    >
      {/* Col 1: Index / Play Button */}
      <div className="col-span-1 flex items-center justify-start text-zinc-400 font-mono text-xs w-8">
        <span className="group-hover:hidden">
          {isCurrent && isPlaying ? (
            <Volume2 className="w-4 h-4 text-[#1DB954] animate-pulse" />
          ) : (
            index + 1
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick();
          }}
          className="hidden group-hover:flex items-center justify-center text-white"
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Col 2: Title & Artist & Thumbnail */}
      <div className="col-span-6 flex items-center gap-3 pr-2 min-w-0">
        <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`font-semibold truncate ${
              isCurrent ? 'text-[#1DB954]' : 'text-white group-hover:text-white'
            }`}
          >
            {track.title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenArtist?.(track.artist, track.artistId);
            }}
            className="block text-xs text-zinc-400 truncate hover:underline max-w-full text-left"
          >
            {track.artist}
          </button>
        </div>
      </div>

      {/* Col 3: Album (hidden on small screen) */}
      <div className="col-span-3 hidden md:block text-xs text-zinc-400 truncate pr-2">
        {track.album || track.artist}
      </div>

      {/* Col 4: Like, Add to Queue & Duration */}
      <div className="col-span-5 md:col-span-2 flex items-center justify-end gap-3 text-xs text-zinc-400">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track.id);
          }}
          className={`opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 ${
            isLiked ? 'opacity-100 text-[#1DB954]' : 'text-zinc-400 hover:text-white'
          }`}
          title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:scale-110"
          title="Add to queue"
        >
          <Plus className="w-4 h-4" />
        </button>

        <span className="font-mono tabular-nums">
          {track.duration ? formatTime(track.duration) : track.durationText || '0:00'}
        </span>
      </div>
    </div>
  );
}
