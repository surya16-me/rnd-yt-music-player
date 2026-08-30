'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MainView from '@/components/MainView';
import PlayerBar from '@/components/PlayerBar';
import QueueDrawer from '@/components/QueueDrawer';
import BottomNav from '@/components/BottomNav';
import FullPlayer from '@/components/FullPlayer';
import AudioEngine from '@/components/AudioEngine';
import { usePlayerStore } from '@/store/usePlayerStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'liked'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<{ name: string; artistId?: string } | null>(null);
  const { isFullPlayerOpen, toggleFullPlayer } = usePlayerStore();

  const handleSelectPlaylist = (query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  const handleSetActiveTab = (tab: 'home' | 'search' | 'library' | 'liked') => {
    setSelectedArtist(null);
    setActiveTab(tab);
  };

  const handleOpenArtist = (name: string, artistId?: string) => {
    setSelectedArtist({ name, artistId });
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Invisible HTML5 Audio Engine & State Sync */}
      <AudioEngine />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          onSelectPlaylist={handleSelectPlaylist}
        />

        {/* Center Main View Area */}
        <MainView
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedArtist={selectedArtist}
          setSelectedArtist={setSelectedArtist}
        />

        {/* Right Collapsible Queue Drawer */}
        <QueueDrawer />
      </div>

      {/* Bottom Sticky Spotify-style Player Bar */}
      <PlayerBar />

      {/* Mobile Bottom Navigation (desktop keeps the left sidebar) */}
      <BottomNav activeTab={activeTab} setActiveTab={handleSetActiveTab} />

      {/* Full-screen Now Playing overlay */}
      {isFullPlayerOpen && (
        <FullPlayer onClose={() => toggleFullPlayer(false)} onOpenArtist={handleOpenArtist} />
      )}
    </div>
  );
}
