import { prisma } from '../config/db.js';
import { AuthService } from './authService.js';
import type { PlaylistDto, PlaylistSongDto, CommentDto } from '@mirocola/shared';

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'playlist';
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}

export class PlaylistService {
  /**
   * Create a new playlist with songs (e.g. from current room queue/history)
   */
  static async createPlaylist(
    userId: number,
    data: {
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
    }
  ): Promise<PlaylistDto> {
    const title = data.title.trim();
    if (!title) {
      throw new Error('El título de la playlist es requerido');
    }

    const slug = generateSlug(title);

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        title,
        description: data.description?.trim() || null,
        slug,
        isPublic: data.isPublic ?? true,
        songs: {
          create: (data.songs || []).map((s, idx) => ({
            youtubeId: s.youtubeId,
            title: s.title,
            channelTitle: s.channelTitle,
            thumbnail: s.thumbnail,
            duration: s.duration,
            orderIndex: idx
          }))
        }
      },
      include: {
        user: true,
        songs: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    // Reward creator with +25 DJ Score points
    await AuthService.awardDjPoints(userId, 25);

    return {
      id: playlist.id,
      userId: playlist.userId,
      authorName: playlist.user.username,
      authorAvatar: playlist.user.avatar,
      title: playlist.title,
      description: playlist.description,
      slug: playlist.slug,
      isPublic: playlist.isPublic,
      likesCount: playlist.likesCount,
      hasLiked: false,
      songsCount: playlist.songs.length,
      songs: playlist.songs.map((s) => ({
        id: s.id,
        youtubeId: s.youtubeId,
        title: s.title,
        channelTitle: s.channelTitle,
        thumbnail: s.thumbnail,
        duration: s.duration,
        orderIndex: s.orderIndex
      })),
      createdAt: playlist.createdAt.toISOString()
    };
  }

  /**
   * Get all playlists belonging to a specific user
   */
  static async getUserPlaylists(userId: number): Promise<PlaylistDto[]> {
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        _count: {
          select: { songs: true, likes: true }
        }
      }
    });

    return playlists.map((p) => ({
      id: p.id,
      userId: p.userId,
      authorName: p.user.username,
      authorAvatar: p.user.avatar,
      title: p.title,
      description: p.description,
      slug: p.slug,
      isPublic: p.isPublic,
      likesCount: p.likesCount,
      songsCount: p._count.songs,
      createdAt: p.createdAt.toISOString()
    }));
  }

  /**
   * Get public playlists (trending by likes and recent)
   */
  static async getPublicPlaylists(options?: {
    limit?: number;
    search?: string;
  }): Promise<PlaylistDto[]> {
    const limit = options?.limit || 20;
    const search = options?.search?.trim();

    const playlists = await prisma.playlist.findMany({
      where: {
        isPublic: true,
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } }
              ]
            }
          : {})
      },
      take: limit,
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: true,
        _count: {
          select: { songs: true, likes: true }
        }
      }
    });

    return playlists.map((p) => ({
      id: p.id,
      userId: p.userId,
      authorName: p.user.username,
      authorAvatar: p.user.avatar,
      title: p.title,
      description: p.description,
      slug: p.slug,
      isPublic: p.isPublic,
      likesCount: p.likesCount,
      songsCount: p._count.songs,
      createdAt: p.createdAt.toISOString()
    }));
  }

  /**
   * Get single playlist by slug or id, with full songs list, comments, and like status
   */
  static async getPlaylistBySlugOrId(
    identifier: string | number,
    currentUserId?: number
  ): Promise<{
    playlist: PlaylistDto;
    comments: CommentDto[];
  } | null> {
    const isId = typeof identifier === 'number' || /^\d+$/.test(String(identifier));

    const playlist = await prisma.playlist.findFirst({
      where: isId ? { id: Number(identifier) } : { slug: String(identifier) },
      include: {
        user: true,
        songs: {
          orderBy: { orderIndex: 'asc' }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: true }
        },
        likes: currentUserId
          ? {
              where: { userId: currentUserId }
            }
          : false
      }
    });

    if (!playlist) return null;

    const hasLiked = currentUserId ? (playlist.likes && playlist.likes.length > 0) : false;

    const playlistDto: PlaylistDto = {
      id: playlist.id,
      userId: playlist.userId,
      authorName: playlist.user.username,
      authorAvatar: playlist.user.avatar,
      title: playlist.title,
      description: playlist.description,
      slug: playlist.slug,
      isPublic: playlist.isPublic,
      likesCount: playlist.likesCount,
      hasLiked,
      songsCount: playlist.songs.length,
      songs: playlist.songs.map((s) => ({
        id: s.id,
        youtubeId: s.youtubeId,
        title: s.title,
        channelTitle: s.channelTitle,
        thumbnail: s.thumbnail,
        duration: s.duration,
        orderIndex: s.orderIndex
      })),
      createdAt: playlist.createdAt.toISOString()
    };

    const comments: CommentDto[] = playlist.comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      username: c.user.username,
      avatar: c.user.avatar,
      content: c.content,
      createdAt: c.createdAt.toISOString()
    }));

    return { playlist: playlistDto, comments };
  }

  /**
   * Toggle like on a playlist
   */
  static async toggleLike(
    playlistId: number,
    userId: number
  ): Promise<{ hasLiked: boolean; likesCount: number }> {
    const existing = await prisma.playlistLike.findUnique({
      where: {
        userId_playlistId: {
          userId,
          playlistId
        }
      }
    });

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new Error('Playlist no encontrada');
    }

    if (existing) {
      // Unlike
      await prisma.playlistLike.delete({
        where: { id: existing.id }
      });
      const updated = await prisma.playlist.update({
        where: { id: playlistId },
        data: { likesCount: { decrement: 1 } }
      });

      // Decrease creator DJ Score by 5
      await AuthService.awardDjPoints(playlist.userId, -5);

      return { hasLiked: false, likesCount: Math.max(0, updated.likesCount) };
    } else {
      // Like
      await prisma.playlistLike.create({
        data: {
          userId,
          playlistId
        }
      });
      const updated = await prisma.playlist.update({
        where: { id: playlistId },
        data: { likesCount: { increment: 1 } }
      });

      // Award creator +5 DJ Score
      await AuthService.awardDjPoints(playlist.userId, 5);

      return { hasLiked: true, likesCount: updated.likesCount };
    }
  }

  /**
   * Add a comment to a playlist
   */
  static async addComment(
    playlistId: number,
    userId: number,
    content: string
  ): Promise<CommentDto> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('El comentario no puede estar vacío');
    }

    if (trimmed.length > 500) {
      throw new Error('El comentario no puede superar los 500 caracteres');
    }

    const comment = await prisma.comment.create({
      data: {
        playlistId,
        userId,
        content: trimmed
      },
      include: {
        user: true
      }
    });

    return {
      id: comment.id,
      userId: comment.userId,
      username: comment.user.username,
      avatar: comment.user.avatar,
      content: comment.content,
      createdAt: comment.createdAt.toISOString()
    };
  }

  /**
   * Delete a playlist (owner only)
   */
  static async deletePlaylist(playlistId: number, userId: number): Promise<boolean> {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new Error('Playlist no encontrada');
    }

    if (playlist.userId !== userId) {
      throw new Error('No tienes permiso para eliminar esta playlist');
    }

    await prisma.playlist.delete({
      where: { id: playlistId }
    });

    return true;
  }
}
