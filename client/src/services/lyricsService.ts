export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsResult {
  syncedLyrics: LyricLine[] | null;
  plainLyrics: string | null;
  trackName?: string;
  artistName?: string;
  source: 'lrclib' | 'none';
}

export class LyricsService {
  /**
   * Clean titles by removing noise like '(Official Video)', '[HD]', etc.
   */
  static cleanTitle(rawTitle: string): { track: string; artistGuess: string } {
    let title = rawTitle;

    // Remove video fluff
    title = title.replace(
      /(\[.*?\]|\(.*?\)|official\s+video|video\s+oficial|audio\s+oficial|official\s+audio|lyric\s+video|video\s+con\s+letra|letra|remix|hd|4k|videoclip|clip\s+officiel)/gi,
      ''
    );

    // If title has 'Artist - Track' format (very common on YouTube)
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      const artistGuess = parts[0].trim();
      const track = parts.slice(1).join(' - ').trim();
      return { track: track || title.trim(), artistGuess };
    }

    return { track: title.trim(), artistGuess: '' };
  }

  /**
   * Parse LRC format string "[mm:ss.xx] Lyric text" into sorted timestamped lines
   */
  static parseLrc(lrcText: string): LyricLine[] {
    const lines = lrcText.split('\n');
    const result: LyricLine[] = [];
    const lrcRegex = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\](.*)/;

    for (const rawLine of lines) {
      const match = rawLine.match(lrcRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();
        const time = minutes * 60 + seconds;

        // Skip metadata tags like [by:xxx] or empty initial lines
        if (text) {
          result.push({ time, text });
        }
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Fetch synced or plain lyrics using the free open LRCLIB API
   */
  static async getLyrics(
    rawTitle: string,
    channelTitle: string,
    durationSeconds?: number
  ): Promise<LyricsResult> {
    const { track, artistGuess } = this.cleanTitle(rawTitle);
    const cleanChannel = channelTitle
      .replace(/(VEVO|- Topic|Official|Oficial|Music|Canal Oficial)/gi, '')
      .trim();

    const artistName = artistGuess || cleanChannel;
    const trackName = track;

    // 1. Try exact match on LRCLIB API
    try {
      const params = new URLSearchParams({
        track_name: trackName,
        artist_name: artistName
      });
      if (durationSeconds && durationSeconds > 0) {
        params.append('duration', Math.round(durationSeconds).toString());
      }

      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics) {
          return {
            syncedLyrics: this.parseLrc(data.syncedLyrics),
            plainLyrics: data.plainLyrics || null,
            trackName: data.trackName,
            artistName: data.artistName,
            source: 'lrclib'
          };
        }
        if (data.plainLyrics) {
          return {
            syncedLyrics: null,
            plainLyrics: data.plainLyrics,
            trackName: data.trackName,
            artistName: data.artistName,
            source: 'lrclib'
          };
        }
      }
    } catch (err) {
      console.warn('[LyricsService] Exact get failed, trying search fallback:', err);
    }

    // 2. Search fallback
    try {
      const query = `${trackName} ${artistName}`.trim();
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
      if (searchRes.ok) {
        const list = await searchRes.json();
        if (Array.isArray(list) && list.length > 0) {
          // Find first entry with syncedLyrics
          const withSync = list.find((item) => item.syncedLyrics);
          if (withSync && withSync.syncedLyrics) {
            return {
              syncedLyrics: this.parseLrc(withSync.syncedLyrics),
              plainLyrics: withSync.plainLyrics || null,
              trackName: withSync.trackName,
              artistName: withSync.artistName,
              source: 'lrclib'
            };
          }

          // Otherwise first with plainLyrics
          const withPlain = list.find((item) => item.plainLyrics);
          if (withPlain && withPlain.plainLyrics) {
            return {
              syncedLyrics: null,
              plainLyrics: withPlain.plainLyrics,
              trackName: withPlain.trackName,
              artistName: withPlain.artistName,
              source: 'lrclib'
            };
          }
        }
      }
    } catch (err) {
      console.warn('[LyricsService] Search lyrics failed:', err);
    }

    return {
      syncedLyrics: null,
      plainLyrics: null,
      source: 'none'
    };
  }
}
