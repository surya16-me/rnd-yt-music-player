// Client-side fallback for broken YouTube thumbnail URLs.
// If the primary thumbnail fails to load, swap to the always-available
// hqdefault image for that video id (once, to avoid an error loop).
export function onThumbError(e: { currentTarget: HTMLImageElement }, videoId?: string) {
  const img = e.currentTarget;
  if (!videoId || img.dataset.fallbackApplied) return;
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (img.src === fallback) return;
  img.dataset.fallbackApplied = '1';
  img.onerror = null;
  img.src = fallback;
}
