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
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /^[a-zA-Z0-9_-]{11}$/
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
   * Fetch metadata using oEmbed (free, fast, no API key required)
   * Falls back to YouTube Data API if key is set in .env
   */
  static async getVideoMeta(input: string): Promise<YouTubeMeta> {
    const videoId = this.extractVideoId(input);

    if (!videoId) {
      // If it's a search term rather than a direct URL, we can use search
      return await this.searchOrFallback(input);
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // If YOUTUBE_API_KEY is available, use YouTube Data API for precise duration
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

    // Default fast oEmbed path (no API key needed!)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;
      const res = await fetch(oembedUrl);

      if (!res.ok) {
        throw new Error(`YouTube oEmbed returned status ${res.status}`);
      }

      const data = (await res.json()) as any;

      return {
        youtubeId: videoId,
        url: standardUrl,
        title: data.title || 'Video de YouTube',
        channelTitle: data.author_name || 'YouTube',
        durationSeconds: 0, // 0 = will be reported dynamically by client player
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    } catch (error) {
      // Last-ditch fallback: construct minimal valid meta
      return {
        youtubeId: videoId,
        url: standardUrl,
        title: `Canción (${videoId})`,
        channelTitle: 'YouTube',
        durationSeconds: 0,
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
            return {
              youtubeId: videoId,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              durationSeconds: 0,
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
