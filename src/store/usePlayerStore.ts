import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '@/types/music';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  queueIndex: number;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  isShuffling: boolean;
  isQueueOpen: boolean;
  isFullPlayerOpen: boolean;
  likedTrackIds: string[];
  history: Track[];

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => void;
  playTrackWithRelated: (track: Track, fallbackQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  toggleQueue: () => void;
  toggleFullPlayer: (open?: boolean) => void;
  toggleLike: (trackId: string) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  replaceQueue: (queue: Track[]) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      queue: [],
      queueIndex: -1,
      volume: 0.8,
      isMuted: false,
      currentTime: 0,
      duration: 0,
      isLooping: false,
      isShuffling: false,
      isQueueOpen: false,
      isFullPlayerOpen: false,
      likedTrackIds: [],
      history: [],

  playTrack: (track, newQueue) => {
    let queue = get().queue;
    let queueIndex = -1;

    if (newQueue) {
      queue = newQueue;
      queueIndex = queue.findIndex((t) => t.id === track.id);
      if (queueIndex === -1) {
        queue = [track, ...newQueue];
        queueIndex = 0;
      }
    } else {
      queueIndex = queue.findIndex((t) => t.id === track.id);
      if (queueIndex === -1) {
        queue = [...queue, track];
        queueIndex = queue.length - 1;
      }
    }

    set((state) => ({
      currentTrack: track,
      queue,
      queueIndex,
      isPlaying: true,
      currentTime: 0,
      history: [track, ...state.history.filter((t) => t.id !== track.id)].slice(0, 50),
    }));
  },

  playTrackWithRelated: (track, fallbackQueue) => {
    // Start playback immediately with whatever queue we have on screen
    get().playTrack(track, fallbackQueue);

    // Then quietly replace the queue with YouTube's suggested (related) tracks
    fetch(`/api/related?id=${encodeURIComponent(track.id)}`)
      .then((res) => res.json())
      .then((data: { tracks?: Track[] }) => {
        const related = data.tracks || [];
        if (related.length === 0) return;
        // Only swap queues if the user hasn't picked a different track meanwhile
        if (get().currentTrack?.id !== track.id) return;
        const deduped = [track, ...related.filter((t) => t.id !== track.id)];
        get().replaceQueue(deduped);
      })
      .catch(() => {
        // Already playing with the fallback queue; related is just a nicer suggestion
      });
  },

  togglePlay: () => {
    if (!get().currentTrack) return;
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    if (get().currentTrack) {
      set({ isPlaying: true });
    }
  },

  nextTrack: () => {
    const { queue, queueIndex, isShuffling, isLooping } = get();
    if (queue.length === 0) return;

    if (isShuffling) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      set({
        queueIndex: randomIndex,
        currentTrack: queue[randomIndex],
        isPlaying: true,
        currentTime: 0,
      });
      return;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      set({
        queueIndex: nextIndex,
        currentTrack: queue[nextIndex],
        isPlaying: true,
        currentTime: 0,
      });
    } else if (isLooping) {
      set({
        queueIndex: 0,
        currentTrack: queue[0],
        isPlaying: true,
        currentTime: 0,
      });
    } else {
      set({ isPlaying: false });
    }
  },

  prevTrack: () => {
    const { queue, queueIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If played more than 3 seconds, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      set({
        queueIndex: prevIndex,
        currentTrack: queue[prevIndex],
        isPlaying: true,
        currentTime: 0,
      });
    } else {
      set({ currentTime: 0 });
    }
  },

  seekTo: (time) => set({ currentTime: time }),

  setVolume: (volume) =>
    set({
      volume: Math.max(0, Math.min(1, volume)),
      isMuted: volume === 0,
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  toggleShuffle: () => set((state) => ({ isShuffling: !state.isShuffling })),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  toggleFullPlayer: (open) =>
    set((state) => ({
      isFullPlayerOpen: typeof open === 'boolean' ? open : !state.isFullPlayerOpen,
      // Full player and queue overlay shouldn't both be up on mobile
      isQueueOpen: typeof open === 'boolean' && open ? false : state.isQueueOpen,
    })),

  toggleLike: (trackId) =>
    set((state) => {
      const isLiked = state.likedTrackIds.includes(trackId);
      return {
        likedTrackIds: isLiked
          ? state.likedTrackIds.filter((id) => id !== trackId)
          : [...state.likedTrackIds, trackId],
      };
    }),

  addToQueue: (track) =>
    set((state) => ({
      queue: [...state.queue, track],
    })),

  removeFromQueue: (index) =>
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      let newIndex = state.queueIndex;
      if (index < state.queueIndex) {
        newIndex--;
      }
      return { queue: newQueue, queueIndex: newIndex };
    }),

  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  replaceQueue: (queue) =>
    set((state) => {
      const index = queue.findIndex((t) => t.id === state.currentTrack?.id);
      return {
        queue,
        queueIndex: index === -1 ? 0 : index,
      };
    }),

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}),
    {
      name: 'spotitube-player',
      partialize: (state) => ({
        likedTrackIds: state.likedTrackIds,
        history: state.history,
        volume: state.volume,
        isMuted: state.isMuted,
        isLooping: state.isLooping,
        isShuffling: state.isShuffling,
      }),
    }
  )
);
