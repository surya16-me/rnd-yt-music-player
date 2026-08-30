const TRANSLATE_API_URL = process.env.NEXT_PUBLIC_TRANSLATE_API_URL;

const cache = new Map<string, string>();

export async function translateText(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed || !TRANSLATE_API_URL) return null;
  const cached = cache.get(trimmed);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${TRANSLATE_API_URL}&q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const sentences = Array.isArray(data) ? (data[0] as unknown[]) : [];
    const translated = sentences
      .map((s) => (Array.isArray(s) ? String(s[0] ?? '') : ''))
      .join('');
    if (!translated) return null;
    cache.set(trimmed, translated);
    return translated;
  } catch {
    return null;
  }
}

// Translate an array of lines with bounded concurrency, writing results as they resolve.
export async function translateLines(
  lines: string[],
  onResult: (index: number, text: string | null) => void
): Promise<void> {
  const parsedConcurrency = parseInt(
    process.env.NEXT_PUBLIC_TRANSLATE_CONCURRENCY ?? '',
    10
  );
  const concurrency = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
    ? parsedConcurrency
    : 6;
  let idx = 0;

  const worker = async () => {
    while (idx < lines.length) {
      const i = idx++;
      const text = lines[i];
      const result = await translateText(text);
      onResult(i, result);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, lines.length) }, () => worker());
  await Promise.all(workers);
}
