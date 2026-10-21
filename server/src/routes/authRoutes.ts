import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { ensureTablesExist } from '../config/db.js';

export const authRouter = Router();

function formatAuthError(err: any): string {
  const msg = err?.message || '';
  if (msg.includes('insecure transport') || msg.includes('1105')) {
    return 'La base de datos en la nube (TiDB Cloud) requiere SSL. Asegúrate de añadir "?sslaccept=strict" al final de tu variable DATABASE_URL en Render.';
  }
  if (
    msg.includes("doesn't exist") ||
    msg.includes('does not exist') ||
    msg.includes('P2021') ||
    err?.code === 'P2021'
  ) {
    return 'Las tablas de la base de datos se están inicializando. Por favor intenta de nuevo en 3 segundos.';
  }
  if (msg.includes("Can't reach database server") || msg.includes('P1001') || err?.code === 'P1001') {
    return 'No se pudo conectar al servidor de base de datos. Revisa las credenciales de Render.';
  }
  return msg || 'Error en la autenticación';
}

/**
 * GET or POST /api/db/init - Trigger database auto-migration/table provisioning
 */
authRouter.all('/db/init', async (_req: Request, res: Response) => {
  try {
    const result = await ensureTablesExist();
    return res.json({
      success: result.success,
      message: result.success
        ? 'Todas las tablas de la base de datos fueron creadas o verificadas exitosamente.'
        : 'Algunas tablas tuvieron advertencias al crearse.',
      errors: result.errors
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || String(err)
    });
  }
});

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
      error: formatAuthError(err)
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
      error: formatAuthError(err)
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
