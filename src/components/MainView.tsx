'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Heart,
  Sparkles,
  Flame,
  Music,
  Clock,
  ChevronLeft,
  ChevronRight,
  Disc,
} from 'lucide-react';
import { Track } from '@/types/music';
import { usePlayerStore } from '@/store/usePlayerStore';
import TrackCard from './TrackCard';
import TrackRow from './TrackRow';
import ArtistView from './ArtistView';

interface MainViewProps {
  activeTab: 'home' | 'search' | 'library' | 'liked';
  setActiveTab: (tab: 'home' | 'search' | 'library' | 'liked') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedArtist: { name: string; artistId?: string } | null;
  setSelectedArtist: (artist: { name: string; artistId?: string } | null) => void;
}

const genreTags = [
  'Top Hits Indonesia',
  'Coldplay',
  'Taylor Swift',
  'Lofi Hip Hop',
  'Indie Indonesia',
  'K-Pop Trending',
  'Acoustic Pop',
  'Anime OST',
  'Rock Classics',
  'Jazz & Blues',
];

export default function MainView({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedArtist,
  setSelectedArtist,
}: MainViewProps) {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const { likedTrackIds, history, playTrack, currentTrack } = usePlayerStore();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  })();

  // Fetch initial trending tracks
  useEffect(() => {
    async function loadTrending() {
      try {
        setIsLoadingTrending(true);
        const res = await fetch('/api/trending');
        const data = await res.json();
        if (data.tracks) {
          setTrendingTracks(data.tracks);
        }
      } catch (err) {
        console.error('Failed to load trending tracks:', err);
      } finally {
        setIsLoadingTrending(false);
      }
    }
    loadTrending();
  }, []);

  // Search logic with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.tracks) {
          setSearchResults(data.tracks);
        }
      } catch (err) {
        console.error('Failed to search tracks:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    setActiveTab('search');
  };

  const handleOpenArtist = (name: string, artistId?: string) => {
    setSelectedArtist({ name, artistId });
  };

  // Filter liked tracks from known tracks (trending + searchResults + history)
  const allKnownTracks = [
    ...trendingTracks,
    ...searchResults,
    ...history,
    ...(currentTrack ? [currentTrack] : []),
  ];
  const uniqueTracksMap = new Map<string, Track>();
  allKnownTracks.forEach((t) => {
    if (!uniqueTracksMap.has(t.id)) uniqueTracksMap.set(t.id, t);
  });
  const likedTracks = likedTrackIds
    .map((id) => uniqueTracksMap.get(id))
    .filter(Boolean) as Track[];

  return (
    <main className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 px-8 flex items-center justify-between bg-black/40 backdrop-blur-md sticky top-0 z-30 border-b border-white/5">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('home')}
              className="w-8 h-8 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className="w-8 h-8 rounded-full bg-black/70 hover:bg-black flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim() === '') setSearchResults([]);
                if (activeTab !== 'search') setActiveTab('search');
              }}
              placeholder="Cari lagu, artis, atau album di YouTube..."
              className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] text-sm text-white placeholder-zinc-400 rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1DB954] to-emerald-300 flex items-center justify-center font-bold text-black text-sm shadow-md">
            S
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* ======================= ARTIST VIEW ======================= */}
        {selectedArtist && (
          <ArtistView
            artistId={selectedArtist.artistId}
            artistName={selectedArtist.name}
            onBack={() => setSelectedArtist(null)}
            onOpenArtist={handleOpenArtist}
          />
        )}

        {/* ======================= TAB: HOME ======================= */}
        {!selectedArtist && activeTab === 'home' && (
          <>
            {/* Hero / Greeting */}
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-6">
                {greeting}, Bro! 👋
              </h1>

              {/* Quick 6 Grid Shortcuts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {genreTags.slice(0, 6).map((tag, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleTagClick(tag)}
                    className="group flex items-center gap-3 bg-white/5 hover:bg-white/15 rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md pr-4"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center flex-shrink-0">
                      <Disc className="w-8 h-8 text-[#1DB954]" />
                    </div>
                    <span className="font-bold text-sm text-white truncate flex-1">
                      {tag}
                    </span>
                    <button className="w-10 h-10 rounded-full bg-[#1DB954] shadow-lg flex items-center justify-center text-black opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all">
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Trending & Populer Hari Ini
                  </h2>
                </div>
                <button
                  onClick={() => handleTagClick('Top Indonesian Hits')}
                  className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider"
                >
                  Lihat Semua
                </button>
              </div>

              {isLoadingTrending ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-[#181818] p-4 rounded-lg animate-pulse space-y-3"
                    >
                      <div className="aspect-square bg-zinc-800 rounded-md" />
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-850 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {trendingTracks.slice(0, 10).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      trackList={trendingTracks}
                      onOpenArtist={handleOpenArtist}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* List Table View (Trending Hits) */}
            {trendingTracks.length > 10 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#1DB954]" />
                  <h3 className="text-xl font-bold text-white">
                    Pilihan Lagu Rekomendasi
                  </h3>
                </div>

                <div className="bg-black/30 rounded-lg p-2 border border-white/5 divide-y divide-white/5">
                  {trendingTracks.slice(10, 20).map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index + 10}
                      trackList={trendingTracks}
                      onOpenArtist={handleOpenArtist}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================= TAB: SEARCH ======================= */}
        {!selectedArtist && activeTab === 'search' && (
          <div className="space-y-6">
            {/* Genre Quick Filters */}
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Kategori Populer
              </h3>
              <div className="flex flex-wrap gap-2">
                {genreTags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTagClick(tag)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      searchQuery === tag
                        ? 'bg-[#1DB954] text-black font-bold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="space-y-3 py-6">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                  <span>Mencari lagu di YouTube...</span>
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 bg-zinc-850/50 rounded-md animate-pulse" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-6">
                {/* Top Result + Top 4 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Result Card */}
                  <div className="lg:col-span-5 bg-[#181818] hover:bg-[#222222] p-6 rounded-xl transition-all group cursor-pointer relative shadow-lg">
                    <h4 className="text-lg font-bold text-white mb-4">Hasil Utama</h4>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={searchResults[0].thumbnail}
                      alt={searchResults[0].title}
                      className="w-24 h-24 rounded-lg object-cover mb-4 shadow-md"
                    />
                    <h3 className="text-2xl font-extrabold text-white mb-1 truncate">
                      {searchResults[0].title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenArtist(searchResults[0].artist, searchResults[0].artistId);
                      }}
                      className="block text-sm text-zinc-400 hover:underline mb-4 text-left"
                    >
                      {searchResults[0].artist}
                    </button>
                    <button
                      onClick={() => playTrack(searchResults[0], searchResults)}
                      className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    </button>
                  </div>

                  {/* Top 4 songs */}
                  <div className="lg:col-span-7 space-y-1">
                    <h4 className="text-lg font-bold text-white mb-4">Lagu Terkait</h4>
                    {searchResults.slice(0, 4).map((track, idx) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={idx}
                        trackList={searchResults}
                        onOpenArtist={handleOpenArtist}
                      />
                    ))}
                  </div>
                </div>

                {/* All Search Results Grid & List */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Semua Hasil Pencarian</h4>
                  <div className="bg-black/30 rounded-lg p-2 border border-white/5 divide-y divide-white/5">
                    {searchResults.map((track, index) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={index}
                        trackList={searchResults}
                        onOpenArtist={handleOpenArtist}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : searchQuery.trim() !== '' ? (
              <div className="text-center py-16 text-zinc-400">
                <Music className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-lg font-bold text-white">Tidak ada hasil ditemukan</p>
                <p className="text-xs text-zinc-500 mt-1">Coba gunakan kata kunci artis atau judul lagu lain</p>
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-base font-semibold text-zinc-400">Ketik lagu apa saja yang ingin kamu dengar</p>
                <p className="text-xs text-zinc-600 mt-1">Jutaan lagu YouTube siap diputar tanpa batas</p>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: LIKED SONGS ======================= */}
        {!selectedArtist && activeTab === 'liked' && (
          <div className="space-y-6">
            {/* Header banner */}
            <div className="flex items-end gap-6 bg-gradient-to-t from-[#121212] to-indigo-900/60 p-6 rounded-2xl border border-indigo-500/20">
              <div className="w-44 h-44 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-400 flex items-center justify-center shadow-2xl flex-shrink-0">
                <Heart className="w-20 h-20 text-white fill-white" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-indigo-300">Playlist</span>
                <h1 className="text-4xl lg:text-5xl font-black text-white mt-1 mb-3">
                  Liked Songs
                </h1>
                <p className="text-xs text-zinc-300">
                  {likedTrackIds.length} lagu tersimpan di koleksimu
                </p>
              </div>
            </div>

            {/* Play all button */}
            {likedTracks.length > 0 && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => playTrack(likedTracks[0], likedTracks)}
                  className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                >
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                </button>
              </div>
            )}

            {/* Table */}
            {likedTracks.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-base font-semibold text-zinc-400">Belum ada lagu yang disukai</p>
                <p className="text-xs text-zinc-600 mt-1">Klik ikon hati di pemutar atau daftar lagu untuk menyimpannya di sini.</p>
              </div>
            ) : (
              <div className="bg-black/30 rounded-lg p-2 border border-white/5 divide-y divide-white/5">
                {likedTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    trackList={likedTracks}
                    onOpenArtist={handleOpenArtist}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: LIBRARY ======================= */}
        {!selectedArtist && activeTab === 'library' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Your Library</h2>

            {/* Recently Played History */}
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Baru Saja Diputar ({history.length})</span>
              </h3>

              {history.length === 0 ? (
                <div className="text-zinc-500 text-xs italic py-4">
                  Belum ada riwayat pemutaran lagu.
                </div>
              ) : (
                <div className="bg-black/30 rounded-lg p-2 border border-white/5 divide-y divide-white/5">
                  {history.map((track, idx) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={idx}
                      trackList={history}
                      onOpenArtist={handleOpenArtist}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
