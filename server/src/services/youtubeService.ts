export interface YouTubeMeta {
  youtubeId: string;
  url: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnail: string;
}

export class YouTubeService {
  /**
   * Extract YouTube Video ID from various link formats or raw ID
   */
  static extractVideoId(input: string): string | null {
    const trimmed = input.trim();

    // Direct 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Standard YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if input is a playlist-only URL
   */
  static isPlaylistOnly(input: string): boolean {
    const trimmed = input.trim();
    return (
      trimmed.includes('youtube.com/playlist?list=') &&
      !this.extractVideoId(trimmed)
    );
  }

  /**
   * Fetch video duration in seconds by scraping the initial player response or oEmbed
   */
  private static async fetchVideoDuration(videoId: string): Promise<number> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });

      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"lengthSeconds":"(\d+)"/);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      }
    } catch (err) {
      console.warn(`[YouTubeService] Could not scrape duration for ${videoId}:`, err);
    }
    return 0;
  }

  /**
   * Fetch metadata using oEmbed + duration scraping
   * Falls back to YouTube Data API if key is set in .env
   */
  static async getVideoMeta(input: string): Promise<YouTubeMeta> {
    const trimmed = input.trim();

    if (this.isPlaylistOnly(trimmed)) {
      throw new Error(
        'No se permiten enlaces de listas de reproducción completas. Ingresa un enlace a un video o canción individual.'
      );
    }

    const videoId = this.extractVideoId(trimmed);

    if (!videoId) {
      // If it's a search term rather than a direct URL, search or fallback
      return await this.searchOrFallback(trimmed);
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 1. If YOUTUBE_API_KEY is available, use YouTube Data API
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const durationIso = item.contentDetails?.duration || 'PT3M0S';
            const durationSec = this.parseISODuration(durationIso);

            return {
              youtubeId: videoId,
              url: standardUrl,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle || 'YouTube',
              durationSeconds: durationSec,
              thumbnail:
                item.snippet.thumbnails?.maxres?.url ||
                item.snippet.thumbnails?.high?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            };
          }
        }
      } catch (err) {
        console.warn('YouTube Data API failed, falling back to oEmbed:', err);
      }
    }

    // 2. Fetch oEmbed metadata + precise scraped duration
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;
      const [oembedRes, scrapedDuration] = await Promise.all([
        fetch(oembedUrl),
        this.fetchVideoDuration(videoId)
      ]);

      if (!oembedRes.ok) {
        throw new Error(`YouTube oEmbed returned status ${oembedRes.status}`);
      }

      const data = (await oembedRes.json()) as any;

      return {
        youtubeId: videoId,
        url: standardUrl,
        title: data.title || 'Video de YouTube',
        channelTitle: data.author_name || 'YouTube',
        durationSeconds: scrapedDuration,
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    } catch (error: any) {
      const fallbackDuration = await this.fetchVideoDuration(videoId);
      return {
        youtubeId: videoId,
        url: standardUrl,
        title: `Canción (${videoId})`,
        channelTitle: 'YouTube',
        durationSeconds: fallbackDuration,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  }

  /**
   * Search YouTube or handle queries if user searched words instead of a URL
   */
  private static async searchOrFallback(query: string): Promise<YouTubeMeta> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(
          query
        )}&part=snippet&type=video&maxResults=1&key=${apiKey}`;
        const res = await fetch(searchUrl);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const videoId = item.id.videoId;
            const duration = await this.fetchVideoDuration(videoId);
            return {
              youtubeId: videoId,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              durationSeconds: duration,
              thumbnail: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            };
          }
        }
      } catch (err) {
        console.warn('Search API failed:', err);
      }
    }

    throw new Error('Por favor ingresa un enlace válido de YouTube (ej. https://youtube.com/watch?v=...)');
  }

  /**
   * Convert ISO 8601 duration (e.g. PT4M13S) to seconds
   */
  private static parseISODuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 180;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
