import type { YouTubeSearchResult } from '@mirocola/shared';

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
   * Fetch video duration in seconds by scraping the initial player response, meta tags, or public APIs
   */
  private static async fetchVideoDuration(videoId: string): Promise<number> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Cookie': 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg'
        }
      });

      if (res.ok) {
        const html = await res.text();

        // Method 1: lengthSeconds in ytInitialPlayerResponse
        const match1 = html.match(/"lengthSeconds":"(\d+)"/);
        if (match1 && match1[1] && parseInt(match1[1], 10) > 0) {
          return parseInt(match1[1], 10);
        }

        // Method 2: approxDurationMs in streaming data
        const match2 = html.match(/"approxDurationMs":"(\d+)"/);
        if (match2 && match2[1] && parseInt(match2[1], 10) > 0) {
          return Math.floor(parseInt(match2[1], 10) / 1000);
        }

        // Method 3: itemprop="duration" meta tag (e.g. PT51M14S)
        const match3 = html.match(/itemprop="duration"\s+content="([^"]+)"/i);
        if (match3 && match3[1]) {
          const durationFromIso = this.parseISODuration(match3[1]);
          if (durationFromIso > 0) {
            return durationFromIso;
          }
        }
      }
    } catch (err) {
      console.warn(`[YouTubeService] Primary duration scraping failed for ${videoId}:`, err);
    }

    // Method 4: Fallback to public Invidious API if direct scraping was rate-limited or blocked
    try {
      const invidiousInstances = [
        'https://inv.nadeko.net',
        'https://invidious.nerdvpn.de',
        'https://vid.puffyan.us'
      ];
      for (const host of invidiousInstances) {
        try {
          const invRes = await fetch(`${host}/api/v1/videos/${videoId}`, {
            signal: AbortSignal.timeout(3000)
          });
          if (invRes.ok) {
            const data = (await invRes.json()) as any;
            if (data.lengthSeconds && data.lengthSeconds > 0) {
              return parseInt(data.lengthSeconds, 10);
            }
          }
        } catch {
          // Continue to next instance
        }
      }
    } catch (err) {
      console.warn(`[YouTubeService] Invidious fallback failed for ${videoId}:`, err);
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
   * Search multiple videos on YouTube with thumbnails, duration and titles
   */
  static async searchVideos(query: string, limit = 6): Promise<YouTubeSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. YouTube Data API v3 if API key available
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(
          trimmed
        )}&part=snippet&type=video&maxResults=${limit}&key=${apiKey}`;
        const res = await fetch(searchUrl);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.items && data.items.length > 0) {
            return data.items.map((item: any) => ({
              youtubeId: item.id.videoId,
              url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              durationSeconds: 0,
              durationFormatted: '',
              thumbnail:
                item.snippet.thumbnails?.medium?.url ||
                item.snippet.thumbnails?.high?.url ||
                `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
            }));
          }
        }
      } catch (err) {
        console.warn('[YouTubeService] API search failed, falling back to scraper:', err);
      }
    }

    // 2. High-speed scraper fallback (no API key needed!)
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });
      const html = await res.text();
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (match && match[1]) {
        const data = JSON.parse(match[1]);
        const contents =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        const itemSection = contents?.find((c: any) => c.itemSectionRenderer)?.itemSectionRenderer?.contents;
        const videoRenderers =
          itemSection?.filter((i: any) => i.videoRenderer).map((i: any) => i.videoRenderer) || [];

        const results: YouTubeSearchResult[] = [];

        for (const v of videoRenderers.slice(0, limit)) {
          if (!v.videoId) continue;
          const durationStr = v.lengthText?.simpleText || '';
          let durationSec = 0;
          if (durationStr) {
            const parts = durationStr.split(':').map((p: string) => parseInt(p, 10));
            if (parts.length === 2) {
              durationSec = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }

          results.push({
            youtubeId: v.videoId,
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            title: v.title?.runs?.[0]?.text || 'Video de YouTube',
            channelTitle: v.ownerText?.runs?.[0]?.text || 'YouTube',
            durationSeconds: durationSec,
            durationFormatted: durationStr,
            thumbnail:
              v.thumbnail?.thumbnails?.[0]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
          });
        }

        return results;
      }
    } catch (err) {
      console.error('[YouTubeService] Scraper search failed:', err);
    }

    return [];
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
