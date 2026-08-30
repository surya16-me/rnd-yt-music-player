'use client';

import React from 'react';
import { Home, Search, Library, Heart, Music, Disc } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface SidebarProps {
  activeTab: 'home' | 'search' | 'library' | 'liked';
  setActiveTab: (tab: 'home' | 'search' | 'library' | 'liked') => void;
  onSelectPlaylist?: (playlistQuery: string) => void;
}

const samplePlaylists = [
  { name: 'Top Hits Indonesia', query: 'Top Hits Indonesia 2026' },
  { name: 'Lofi Chill Beats', query: 'Lofi hip hop chill beats' },
  { name: 'Indie Indonesia Terbaik', query: 'Indie Indonesia Populer' },
  { name: 'Acoustic Favorites', query: 'Acoustic pop favorites' },
  { name: 'Coldplay Complete', query: 'Coldplay best songs' },
  { name: 'Deep Focus & Study', query: 'Deep focus instrumental' },
];

export default function Sidebar({ activeTab, setActiveTab, onSelectPlaylist }: SidebarProps) {
  const { likedTrackIds } = usePlayerStore();

  return (
    <aside className="hidden md:flex w-64 bg-black shrink-0 flex-col h-full border-r border-zinc-900 select-none">
      {/* App Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-bold shadow-lg shadow-[#1db95433]">
            <Music className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Spoti<span className="text-[#1DB954]">Tube</span></span>
            <span className="block text-[10px] text-zinc-500 font-medium tracking-wider uppercase">YouTube Music Web</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="px-3 space-y-1">
        <button
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
            activeTab === 'home'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
            activeTab === 'search'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
            activeTab === 'library'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Library className="w-5 h-5" />
          <span>Your Library</span>
        </button>
      </div>

      <div className="my-4 px-4">
        <div className="h-px bg-zinc-800" />
      </div>

      {/* Secondary Actions */}
      <div className="px-3 space-y-1">
        <button
          onClick={() => setActiveTab('liked')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            activeTab === 'liked'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <div className="w-6 h-6 rounded bg-linear-to-br from-indigo-600 to-purple-400 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span>Liked Songs</span>
          {likedTrackIds.length > 0 && (
            <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
              {likedTrackIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider px-2 pt-2">
          Recommended Playlists
        </div>
        {samplePlaylists.map((pl, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPlaylist && onSelectPlaylist(pl.query)}
            className="w-full text-left px-2 py-1.5 text-sm text-zinc-400 hover:text-white hover:underline truncate transition-colors flex items-center gap-2"
          >
            <Disc className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="truncate">{pl.name}</span>
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-900 text-xs text-zinc-500 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Audio Streaming Online
        </div>
        <span>Powered by YouTube Music</span>
      </div>
    </aside>
  );
}
