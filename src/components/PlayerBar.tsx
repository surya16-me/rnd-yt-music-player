'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime } from '@/lib/formatTime';
import { onThumbError } from '@/lib/img';

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLooping,
    isShuffling,
    isQueueOpen,
    likedTrackIds,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    toggleQueue,
    toggleLike,
    toggleFullPlayer,
  } = usePlayerStore();

  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const seekbar = (
    <div className="w-full flex items-center gap-2 text-xs text-zinc-400 font-mono">
      <span className="w-9 text-right tabular-nums shrink-0">{formatTime(currentTime)}</span>

      <div className="relative flex-1 flex items-center group">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progressPercent || 0}
          onChange={handleSeek}
          className="slider w-full"
          style={{
            background: `linear-gradient(to right, var(--slider-fill) ${progressPercent}%, var(--slider-track) ${progressPercent}%)`,
          }}
        />
      </div>

      <span className="w-9 text-left tabular-nums shrink-0">{formatTime(duration)}</span>
    </div>
  );

  const transportButtons = (
    <div className="flex items-center gap-3 sm:gap-5">
      <button
        onClick={prevTrack}
        className="text-zinc-300 hover:text-white transition-colors hover:scale-105"
        title="Previous"
      >
        <SkipBack className="w-5 h-5 fill-current" />
      </button>

      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-black" />
        ) : (
          <Play className="w-4 h-4 fill-black ml-0.5" />
        )}
      </button>

      <button
        onClick={nextTrack}
        className="text-zinc-300 hover:text-white transition-colors hover:scale-105"
        title="Next"
      >
        <SkipForward className="w-5 h-5 fill-current" />
      </button>
    </div>
  );

  if (!currentTrack) {
    return (
      <footer className="h-20 bg-black/90 border-t border-zinc-800 px-4 flex items-center justify-between text-zinc-500 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center text-zinc-600">
            <ListMusic className="w-5 h-5" />
          </div>
          <span>Select a song from YouTube to start listening</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 bg-[#181818] border-t border-zinc-800 px-3 sm:px-4 py-2 select-none z-50">
      {/* ===== Mobile: compact 2-row layout ===== */}
      <div className="md:hidden flex flex-col gap-1">
        {/* Row 1: track info + primary controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => toggleFullPlayer(true)}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
            title="Open full player"
          >
            <div className="relative w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                onError={(e) => onThumbError(e, currentTrack.id)}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate leading-tight">
                {currentTrack.title}
              </span>
              <span className="text-xs text-zinc-400 truncate leading-tight">
                {currentTrack.artist}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleLike(currentTrack.id)}
              className={`transition-colors ${
                isLiked ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label="Toggle like"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
            </button>
            {transportButtons}
            <button
              onClick={toggleQueue}
              className={`transition-colors p-1 ${
                isQueueOpen ? 'text-[#1DB954] bg-white/10 rounded' : 'text-zinc-400 hover:text-white'
              }`}
              title="Queue"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Row 2: seekbar */}
        {seekbar}
      </div>

      {/* ===== Desktop: 3-column layout ===== */}
      <div className="hidden md:flex items-center justify-between">
        {/* Left: Track Info */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-45 max-w-75">
          <button
            onClick={() => toggleFullPlayer(true)}
            className="flex items-center gap-3.5 min-w-0 flex-1 text-left"
            title="Open full player"
          >
            <div className="relative w-14 h-14 rounded-md overflow-hidden bg-zinc-800 shrink-0 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                onError={(e) => onThumbError(e, currentTrack.id)}
              />
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </span>
              <span className="text-xs text-zinc-400 truncate hover:underline cursor-pointer">
                {currentTrack.artist}
              </span>
            </div>
          </button>

          <button
            onClick={() => toggleLike(currentTrack.id)}
            className={`transition-colors hover:scale-110 shrink-0 ${
              isLiked ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
          </button>
        </div>

        {/* Center: Controls & Seekbar */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-162.5">
          <div className="flex items-center gap-5">
            <button
              onClick={toggleShuffle}
              className={`transition-colors ${
                isShuffling ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Enable shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            {transportButtons}
            <button
              onClick={toggleLoop}
              className={`transition-colors ${
                isLooping ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Enable repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {seekbar}
        </div>

        {/* Right: Tools & Volume */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-40">
          <button
            onClick={toggleQueue}
            className={`transition-colors p-1 rounded ${
              isQueueOpen ? 'text-[#1DB954] bg-white/10' : 'text-zinc-400 hover:text-white'
            }`}
            title="Queue"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <VolumeIcon className="w-5 h-5" />
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="slider w-24"
              style={{
                background: `linear-gradient(to right, var(--slider-fill) ${(isMuted ? 0 : volume) * 100}%, var(--slider-track) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
