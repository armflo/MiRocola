import { Router, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const authRouter = Router();

/**
 * POST /api/auth/register
 */
authRouter.post('/register', async (req, res: Response) => {
  try {
    const { email, username, password, avatar, bio } = req.body;
    const result = await AuthService.register({
      email,
      username,
      password,
      avatar,
      bio
    });
    return res.status(201).json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Error al registrar usuario'
    });
  }
});

/**
 * POST /api/auth/login
 */
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;
    const result = await AuthService.login({
      emailOrUsername,
      password
    });
    return res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Credenciales incorrectas'
    });
  }
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    const user = await AuthService.getUserById(req.userId);
    return res.json({
      success: true,
      user
    });
  } catch (err: any) {
    return res.status(404).json({
      success: false,
      error: err.message || 'Usuario no encontrado'
    });
  }
});

/**
 * PUT /api/auth/profile
 */
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    const updatedUser = await AuthService.updateProfile(req.userId, req.body);
    return res.json({
      success: true,
      user: updatedUser
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Error al actualizar perfil'
    });
  }
});

/**
 * GET /api/users/:username (Public Profile)
 */
authRouter.get('/users/:username', async (req, res: Response) => {
  try {
    const profile = await AuthService.getPublicProfile(req.params.username);
    return res.json({
      success: true,
      ...profile
    });
  } catch (err: any) {
    return res.status(404).json({
      success: false,
      error: err.message || 'Perfil no encontrado'
    });
  }
});
