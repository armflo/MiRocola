import type { PlaylistDto, CommentDto } from '@mirocola/shared';
import { BACKEND_URL } from './socket';
import { authService } from './auth';

export const playlistService = {
  async createPlaylist(data: {
    title: string;
    description?: string;
    isPublic?: boolean;
    songs: Array<{
      youtubeId: string;
      title: string;
      channelTitle: string;
      thumbnail: string;
      duration: number;
    }>;
  }): Promise<{ success: boolean; playlist?: PlaylistDto; error?: string }> {
    const token = authService.getToken();
    if (!token) return { success: false, error: 'Inicia sesión para guardar tu playlist' };

    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, playlist: json.playlist };
      }
      return { success: false, error: json.error || 'Error al guardar la playlist' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión' };
    }
  },

  async getMyPlaylists(): Promise<{ success: boolean; playlists: PlaylistDto[]; error?: string }> {
    const token = authService.getToken();
    if (!token) return { success: false, playlists: [], error: 'No autenticado' };

    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/mine`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, playlists: json.playlists };
      }
      return { success: false, playlists: [], error: json.error };
    } catch (err: any) {
      return { success: false, playlists: [], error: err.message };
    }
  },

  async getPublicPlaylists(search?: string): Promise<{ success: boolean; playlists: PlaylistDto[] }> {
    const token = authService.getToken();
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, playlists: json.playlists };
      }
      return { success: false, playlists: [] };
    } catch {
      return { success: false, playlists: [] };
    }
  },

  async getPlaylist(identifier: string | number): Promise<{
    success: boolean;
    playlist?: PlaylistDto;
    comments?: CommentDto[];
    error?: string;
  }> {
    const token = authService.getToken();
    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${identifier}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, playlist: json.playlist, comments: json.comments };
      }
      return { success: false, error: json.error || 'Playlist no encontrada' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async toggleLike(playlistId: number): Promise<{ success: boolean; hasLiked?: boolean; likesCount?: number }> {
    const token = authService.getToken();
    if (!token) return { success: false };

    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      return json;
    } catch {
      return { success: false };
    }
  },

  async addComment(playlistId: number, content: string): Promise<{ success: boolean; comment?: CommentDto; error?: string }> {
    const token = authService.getToken();
    if (!token) return { success: false, error: 'Inicia sesión para comentar' };

    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deletePlaylist(playlistId: number): Promise<boolean> {
    const token = authService.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      return !!json.success;
    } catch {
      return false;
    }
  }
};
