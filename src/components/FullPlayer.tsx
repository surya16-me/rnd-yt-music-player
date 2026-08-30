'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
  Music,
  ChevronDown,
  Volume2,
  Volume1,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime } from '@/lib/formatTime';
import { translateLines } from '@/lib/translate';
import { onThumbError } from '@/lib/img';
import { Track } from '@/types/music';

interface FullPlayerProps {
  onClose: () => void;
  onOpenArtist: (name: string, artistId?: string) => void;
}

type Tab = 'upnext' | 'lyrics';

export default function FullPlayer({ onClose, onOpenArtist }: FullPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLooping,
    isShuffling,
    queue,
    queueIndex,
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
    playTrack,
  } = usePlayerStore();

  const [tab, setTab] = useState<Tab>('upnext');
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsSource, setLyricsSource] = useState<string | null>(null);
  const [lyricsState, setLyricsState] = useState<'idle' | 'loading' | 'done' | 'empty'>('idle');
  const [isSynced, setIsSynced] = useState(false);
  const [syncedLines, setSyncedLines] = useState<{ time: number; text: string }[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translations, setTranslations] = useState<(string | null)[]>([]);
  const fetchedTracks = useRef(new Set<string>());
  const inFlight = useRef<string | null>(null);

  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const upcoming = currentTrack ? queue.slice(queueIndex + 1) : [];

  // Compute the active synced-lyrics line index based on current playback time.
  let activeLyricIndex = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (currentTime >= syncedLines[i].time) activeLyricIndex = i;
    else break;
  }
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);

  // Auto-scroll the active synced-lyrics line into view.
  useEffect(() => {
    const el = activeLyricRef.current;
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeLyricIndex]);

  // Reset lyrics state whenever the current track changes.
  useEffect(() => {
    if (tab === 'lyrics') {
      setLyricsState('idle');
      setLyrics(null);
      setLyricsSource(null);
      setIsSynced(false);
      setSyncedLines([]);
      setShowTranslation(false);
      setTranslations([]);
    }
    // Reset even when not on the lyrics tab, so stale content never lingers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Fetch lyrics for the current track when the lyrics tab is requested.
  // Loading state and caching are driven by refs so a state update never
  // re-triggers/cancels the in-flight request.
  useEffect(() => {
    const id = currentTrack?.id;
    if (!id || tab !== 'lyrics') return;
    if (fetchedTracks.current.has(id)) return;
    if (inFlight.current === id) return;

    inFlight.current = id;
    setLyricsState('loading');

    const params = new URLSearchParams({ id });
    if (currentTrack?.title) params.set('title', currentTrack.title);
    if (currentTrack?.artist) params.set('artist', currentTrack.artist);

    fetch(`/api/lyrics?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          setLyricsState('empty');
          return;
        }
        const data = await res.json();
        if (data.synced && Array.isArray(data.lines) && data.lines.length > 0) {
          setSyncedLines(data.lines);
          setIsSynced(true);
          setLyrics(null);
          setLyricsSource(null);
          setLyricsState('done');
        } else {
          setIsSynced(false);
          setLyrics(data.lyrics ?? null);
          setLyricsSource(data.source ?? null);
          setLyricsState(data.lyrics ? 'done' : 'empty');
        }
      })
      .catch(() => {
        setLyricsState('empty');
      })
      .finally(() => {
        inFlight.current = null;
        fetchedTracks.current.add(id);
      });
    // title/artist are stable per video id and intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, tab]);

  // Translate synced-lyrics lines lazily when the translation toggle is on.
  useEffect(() => {
    if (!showTranslation || !isSynced || syncedLines.length === 0) return;
    let cancelled = false;
    setTranslations(new Array(syncedLines.length).fill(null));
    translateLines(
      syncedLines.map((l) => l.text),
      (index, text) => {
        if (cancelled) return;
        setTranslations((prev) => {
          const next = [...prev];
          next[index] = text;
          return next;
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [showTranslation, isSynced, syncedLines]);

  // Drag-to-dismiss (swipe down)
  const dragRef = useRef({ startY: 0, startT: 0, dy: 0 });
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragRef.current = { startY: e.clientY, startT: Date.now(), dy: 0 };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = Math.max(0, e.clientY - dragRef.current.startY);
    dragRef.current.dy = dy;
    setDragY((prev) => (prev === dy ? prev : dy));
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dist = dragRef.current.dy;
    const elapsed = Date.now() - dragRef.current.startT;
    const velocity = dist / Math.max(1, elapsed);
    setDragY(0);
    if (dist > 120 || velocity > 0.6) {
      onClose();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    seekTo(newTime);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const playFromQueue = (track: Track) => {
    playTrack(track, queue);
  };

  const renderSeekbar = (
    <div className="w-full flex items-center gap-2 md:gap-3 text-xs text-zinc-400 font-mono">
      <span className="w-10 text-right tabular-nums shrink-0">{formatTime(currentTime)}</span>
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
      <span className="w-10 text-left tabular-nums shrink-0">{formatTime(duration)}</span>
    </div>
  );

  const renderTransport = (
    <div className="flex items-center justify-center gap-6 md:gap-8">
      <button
        onClick={toggleShuffle}
        className={`transition-colors ${isShuffling ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'}`}
        title="Shuffle"
      >
        <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      <button
        onClick={prevTrack}
        className="text-zinc-200 hover:text-white transition-colors hover:scale-105"
        title="Previous"
      >
        <SkipBack className="w-8 h-8 md:w-9 md:h-9 fill-current" />
      </button>

      <button
        onClick={togglePlay}
        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-7 h-7 fill-black" />
        ) : (
          <Play className="w-7 h-7 fill-black ml-1" />
        )}
      </button>

      <button
        onClick={nextTrack}
        className="text-zinc-200 hover:text-white transition-colors hover:scale-105"
        title="Next"
      >
        <SkipForward className="w-8 h-8 md:w-9 md:h-9 fill-current" />
      </button>

      <button
        onClick={toggleLoop}
        className={`transition-colors ${isLooping ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'}`}
        title="Repeat"
      >
        <Repeat className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );

  if (!currentTrack) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#101010] flex flex-col overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ transform: `translateY(${dragY}px)`, transition: dragging.current ? 'none' : 'transform 0.25s ease' }}
    >
      {/* Drag handle (mobile) */}
      <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
        <div className="w-10 h-1 rounded-full bg-zinc-700" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 shrink-0 select-none">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <ChevronDown className="w-6 h-6 md:hidden" />
          <X className="hidden md:block w-6 h-6" />
        </button>
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] select-none">
          Now Playing
        </span>
        <button
          onClick={toggleQueue}
          className="transition-colors p-1 text-zinc-400 hover:text-white"
          title="Queue"
        >
          <ListMusic className="w-6 h-6" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pb-10 md:pb-0 md:h-full md:flex md:flex-col">
          {/* MOBILE layout */}
          <div className="md:hidden flex flex-col gap-6">
            {/* Cover */}
            <div className="flex justify-center">
              <div className="relative w-72 h-72 max-w-[80vw] max-h-[80vw] aspect-square rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  onError={(e) => onThumbError(e, currentTrack.id)}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold text-white truncate">{currentTrack.title}</h2>
                <button
                  onClick={() => {
                    onClose();
                    onOpenArtist(currentTrack.artist, currentTrack.artistId);
                  }}
                  className="block text-sm text-zinc-400 hover:text-white hover:underline text-left truncate"
                >
                  {currentTrack.artist}
                </button>
              </div>
              <button
                onClick={() => toggleLike(currentTrack.id)}
                className={`shrink-0 mt-1 ${isLiked ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'}`}
                aria-label="Toggle like"
              >
                <Heart className={`w-7 h-7 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
              </button>
            </div>

            {renderSeekbar}
            {renderTransport}

            {/* Tabs + panel */}
            <div className="pt-2">
              <TabBar tab={tab} setTab={setTab} />
              <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
                {tab === 'upnext' ? renderUpNext() : renderLyricsPanel()}
              </div>
            </div>
          </div>

          {/* DESKTOP layout */}
          <div className="hidden md:grid md:grid-cols-5 gap-12 md:flex-1 md:items-stretch md:min-h-0">
            {/* Left: cover + info */}
            <div className="md:col-span-2 flex flex-col gap-6 items-start md:justify-center">
              <div className="relative w-72 xl:w-80 shrink-0 aspect-square rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  onError={(e) => onThumbError(e, currentTrack.id)}
                />
              </div>

              <div className="w-full max-w-md space-y-1">
                <h2 className="text-2xl xl:text-3xl font-extrabold text-white truncate">{currentTrack.title}</h2>
                <button
                  onClick={() => {
                    onClose();
                    onOpenArtist(currentTrack.artist, currentTrack.artistId);
                  }}
                  className="text-sm text-zinc-400 hover:text-white hover:underline"
                >
                  {currentTrack.artist}
                </button>
              </div>
              <button
                onClick={() => toggleLike(currentTrack.id)}
                className={`shrink-0 mt-1 ${isLiked ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'}`}
                aria-label="Toggle like"
              >
                <Heart className={`w-7 h-7 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
              </button>
            </div>

            {/* Right: tabs + panel */}
            <div className="md:col-span-3 md:h-full md:flex md:flex-col md:overflow-hidden">
              <TabBar tab={tab} setTab={setTab} />
              <div className="mt-6 md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-2">
                {tab === 'upnext' ? renderUpNext() : renderLyricsPanel()}
              </div>
            </div>
          </div>

          {/* Desktop bottom control bar */}
          <div className="hidden md:block w-full pt-6 pb-8 shrink-0">
            {renderSeekbar}
            <div className="flex items-center justify-between pt-2">
              <div className="flex-1" />
              <div className="flex-1">{renderTransport}</div>
              <div className="flex-1 flex items-center justify-end gap-3">
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                  <VolumeButtonIcon muted={isMuted || volume === 0} volume={volume} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  className="slider w-28"
                  style={{
                    background: `linear-gradient(to right, var(--slider-fill) ${(isMuted ? 0 : volume) * 100}%, var(--slider-track) ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function TabBar({ tab: current, setTab: set }: { tab: Tab; setTab: (t: Tab) => void }) {
    return (
      <div className="flex gap-2 p-1 bg-black/40 rounded-full w-fit">
        <button
          onClick={() => set('upnext')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            current === 'upnext' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Up Next
        </button>
        <button
          onClick={() => set('lyrics')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            current === 'lyrics' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Lyrics
        </button>
      </div>
    );
  }

  function renderUpNext() {
    if (!currentTrack) return null;
    if (upcoming.length === 0) {
      return (
        <div className="text-sm text-zinc-500 italic py-8 text-center">
          No upcoming tracks in queue. Add more songs from Search or Home!
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {upcoming.map((track, idx) => (
          <div
            key={`${track.id}-${queueIndex + 1 + idx}`}
            onClick={() => playFromQueue(track)}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-10 h-10 rounded object-cover shrink-0"
              onError={(e) => onThumbError(e, track.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{track.title}</div>
              <div className="text-xs text-zinc-400 truncate">{track.artist}</div>
            </div>
            <span className="text-xs text-zinc-500 font-mono shrink-0">
              {track.duration ? formatTime(track.duration) : track.durationText || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }

  function renderLyricsPanel() {
    if (lyricsState === 'loading') {
      return (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-8 justify-center">
          <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
          <span>Memuat lirik...</span>
        </div>
      );
    }
    if (lyricsState === 'empty') {
      return (
        <div className="text-center py-10 text-zinc-500">
          <Music className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-semibold">Lirik tidak tersedia untuk lagu ini</p>
        </div>
      );
    }
    if (isSynced) {
      return (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowTranslation((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                showTranslation
                  ? 'border-[#1DB954] text-[#1DB954] bg-[#1DB954]/10'
                  : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              Terjemahan
            </button>
          </div>
          {renderSyncedLyrics()}
        </>
      );
    }
    return (
      <div className="text-center">
        <pre className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-zinc-200">
          {lyrics}
        </pre>
        {lyricsSource && (
          <p className="text-[11px] text-zinc-600 mt-4 uppercase tracking-wider">{lyricsSource}</p>
        )}
      </div>
    );
  }

  function renderSyncedLyrics() {
    return (
      <div className="relative">
        <div className="space-y-5 py-4">
          {syncedLines.map((line, i) => {
            const active = i === activeLyricIndex;
            const translation = showTranslation ? translations[i] : null;
            return (
              <div key={i} className="space-y-1">
                <p
                  ref={active ? activeLyricRef : undefined}
                  className={`transition-colors duration-500 leading-snug ${
                    active
                      ? 'text-white text-2xl font-bold'
                      : i < activeLyricIndex
                      ? 'text-zinc-500 text-base font-semibold'
                      : 'text-zinc-600 text-base'
                  }`}
                >
                  {line.text}
                </p>
                {translation && (
                  <p
                    className={`transition-colors duration-500 text-sm italic leading-snug ${
                      active ? 'text-[#1DB954]/90' : 'text-zinc-500'
                    }`}
                  >
                    {translation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {lyricsSource && (
          <p className="text-[11px] text-zinc-600 mt-4 uppercase tracking-wider">{lyricsSource}</p>
        )}
      </div>
    );
  }
}

function VolumeButtonIcon({ muted, volume }: { muted: boolean; volume: number }) {
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return <Icon className="w-5 h-5" />;
}
