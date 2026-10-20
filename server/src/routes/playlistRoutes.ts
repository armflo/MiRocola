import { Router, Response } from 'express';
import { PlaylistService } from '../services/playlistService.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * POST /api/playlists
 * Create a new playlist (requires login)
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, description, isPublic, songs } = req.body;

    const playlist = await PlaylistService.createPlaylist(userId, {
      title,
      description,
      isPublic,
      songs
    });

    res.status(201).json({ success: true, playlist });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Error al crear la playlist' });
  }
});

/**
 * GET /api/playlists/mine
 * Get playlists created by the logged in user
 */
router.get('/mine', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const playlists = await PlaylistService.getUserPlaylists(userId);
    res.json({ success: true, playlists });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/playlists
 * Browse public playlists (trending / search)
 */
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const search = req.query.q ? String(req.query.q) : undefined;

    const playlists = await PlaylistService.getPublicPlaylists({ limit, search });
    res.json({ success: true, playlists });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/playlists/:identifier
 * Get single playlist by id or slug
 */
router.get('/:identifier', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const identifier = String(req.params.identifier);
    const currentUserId = req.userId;

    const result = await PlaylistService.getPlaylistBySlugOrId(identifier, currentUserId);
    if (!result) {
      res.status(404).json({ success: false, error: 'Playlist no encontrada' });
      return;
    }

    res.json({ success: true, playlist: result.playlist, comments: result.comments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/playlists/:id/like
 * Like or unlike a playlist
 */
router.post('/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const playlistId = parseInt(String(req.params.id), 10);
    const userId = req.userId!;

    const result = await PlaylistService.toggleLike(playlistId, userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/playlists/:id/comments
 * Add a comment to a playlist
 */
router.post('/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const playlistId = parseInt(String(req.params.id), 10);
    const userId = req.userId!;
    const { content } = req.body;

    const comment = await PlaylistService.addComment(playlistId, userId, content);
    res.status(201).json({ success: true, comment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/playlists/:id
 * Delete a playlist
 */
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const playlistId = parseInt(String(req.params.id), 10);
    const userId = req.userId!;

    await PlaylistService.deletePlaylist(playlistId, userId);
    res.json({ success: true, message: 'Playlist eliminada correctamente' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export const playlistRouter = router;
