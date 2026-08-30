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
    <footer className="h-24 bg-[#181818] border-t border-zinc-800 px-4 py-2 flex items-center justify-between select-none z-50">
      {/* Left: Track Info */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-45 max-w-75">
        <div className="relative w-14 h-14 rounded-md overflow-hidden bg-zinc-800 shrink-0 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
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
        {/* Buttons */}
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

        {/* Progress Slider */}
        <div className="w-full flex items-center gap-2.5 text-xs text-zinc-400 font-mono">
          <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>

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

          <span className="w-10 text-left tabular-nums">{formatTime(duration)}</span>
        </div>
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
    </footer>
  );
}
