'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MainView from '@/components/MainView';
import PlayerBar from '@/components/PlayerBar';
import QueueDrawer from '@/components/QueueDrawer';
import AudioEngine from '@/components/AudioEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'liked'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<{ name: string; artistId?: string } | null>(null);

  const handleSelectPlaylist = (query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  const handleSetActiveTab = (tab: 'home' | 'search' | 'library' | 'liked') => {
    setSelectedArtist(null);
    setActiveTab(tab);
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
    </div>
  );
}
