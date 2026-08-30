'use client';

import React from 'react';
import { Home, Search, Library, Heart } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface BottomNavProps {
  activeTab: 'home' | 'search' | 'library' | 'liked';
  setActiveTab: (tab: 'home' | 'search' | 'library' | 'liked') => void;
}

const items: { tab: 'home' | 'search' | 'library' | 'liked'; label: string; icon: React.ElementType }[] = [
  { tab: 'home', label: 'Home', icon: Home },
  { tab: 'search', label: 'Search', icon: Search },
  { tab: 'library', label: 'Library', icon: Library },
  { tab: 'liked', label: 'Liked', icon: Heart },
];

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const { likedTrackIds } = usePlayerStore();

  return (
    <nav className="md:hidden shrink-0 bg-black border-t border-zinc-900 pb-[env(safe-area-inset-bottom)] select-none">
      <div className="grid grid-cols-4">
        {items.map(({ tab, label, icon: Icon }) => {
          const active = activeTab === tab;
          const showBadge = tab === 'liked' && likedTrackIds.length > 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors"
            >
              <span className="relative">
                <Icon
                  className={`w-5 h-5 ${active ? 'text-[#1DB954]' : 'text-zinc-400'}`}
                  fill={tab === 'liked' && showBadge ? 'currentColor' : 'none'}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#1DB954] text-black text-[9px] font-bold flex items-center justify-center">
                    {likedTrackIds.length > 99 ? '99+' : likedTrackIds.length}
                  </span>
                )}
              </span>
              <span className={active ? 'text-[#1DB954]' : 'text-zinc-400'}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
