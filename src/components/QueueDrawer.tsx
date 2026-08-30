'use client';

import React from 'react';
import { X, Trash2, Music } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { onThumbError } from '@/lib/img';

export default function QueueDrawer() {
  const {
    isQueueOpen,
    toggleQueue,
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);

  const renderQueueBody = () => (
    <>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[#1DB954]" />
          <h3 className="font-bold text-white text-base">Queue</h3>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
              title="Clear entire queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={toggleQueue}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
            aria-label="Close queue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800">
        {currentTrack && (
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Now Playing
            </h4>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-11 h-11 rounded object-cover shrink-0"
                onError={(e) => onThumbError(e, currentTrack.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#1DB954] truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Next in Queue</span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {upcomingTracks.length} tracks
            </span>
          </h4>

          {upcomingTracks.length === 0 ? (
            <div className="text-xs text-zinc-500 py-6 text-center italic">
              No upcoming tracks in queue. Add more songs from Search or Home!
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.map((track, idx) => {
                const actualIndex = queueIndex + 1 + idx;
                return (
                  <div
                    key={`${track.id}-${actualIndex}`}
                    className="group flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs"
                    onClick={() => playTrack(track)}
                  >
                    <span className="w-4 text-zinc-500 font-mono text-center">
                      {idx + 1}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-9 h-9 rounded object-cover shrink-0"
                      onError={(e) => onThumbError(e, track.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate group-hover:text-[#1DB954]">
                        {track.title}
                      </div>
                      <div className="text-zinc-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(actualIndex);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1"
                      title="Remove from queue"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: right sidebar (in flex flow) */}
      <div className="hidden md:flex w-80 bg-[#121212] border-l border-zinc-800 flex-col h-full shrink-0 z-40 select-none">
        {renderQueueBody()}
      </div>

      {/* Mobile: full bottom sheet */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end select-none">
        <button
          onClick={toggleQueue}
          className="absolute inset-0 bg-black/60"
          aria-label="Close queue"
        />
        <div className="relative bg-[#121212] rounded-t-2xl border-t border-zinc-800 max-h-[85vh] flex flex-col shadow-2xl pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto w-10 h-1 rounded-full bg-zinc-700 my-2 shrink-0" />
          {renderQueueBody()}
        </div>
      </div>
    </>
  );
}
