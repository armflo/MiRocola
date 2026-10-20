import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import type {
  AuthUser,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload
} from '@mirocola/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'mirocola-secret-key-super-secure-jwt-2026';

export class AuthService {
  /**
   * Helper to format User model to AuthUser DTO
   */
  private static formatUser(user: {
    id: number;
    email: string;
    username: string;
    avatar: string;
    bio: string | null;
    djScore: number;
    createdAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      djScore: user.djScore,
      createdAt: user.createdAt.toISOString()
    };
  }

  /**
   * Register a new user
   */
  static async register(payload: RegisterPayload): Promise<{ user: AuthUser; token: string }> {
    const email = payload.email.trim().toLowerCase();
    const username = payload.username.trim().toLowerCase();
    const password = payload.password;

    if (!email || !email.includes('@')) {
      throw new Error('Ingresa un correo electrónico válido.');
    }

    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres.');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('El nombre de usuario solo puede contener letras, números y guiones bajos.');
    }

    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    // Check if email already registered
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error('Este correo electrónico ya está registrado.');
    }

    // Check if username already taken
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      throw new Error('Este nombre de usuario ya está en uso. Por favor elige otro.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatar =
      payload.avatar?.trim() ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        avatar,
        bio: payload.bio?.trim() || '¡Amante de la buena música en MiRocola!',
        djScore: 50 // Welcome bonus!
      }
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

    return {
      user: this.formatUser(newUser),
      token
    };
  }

  /**
   * Login user by email or username
   */
  static async login(payload: LoginPayload): Promise<{ user: AuthUser; token: string }> {
    const identifier = payload.emailOrUsername.trim().toLowerCase();
    const password = payload.password;

    if (!identifier || !password) {
      throw new Error('Ingresa tu usuario/correo y contraseña.');
    }

    // Find by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }]
      }
    });

    if (!user) {
      throw new Error('Credenciales incorrectas. Verifica tu usuario o contraseña.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Credenciales incorrectas. Verifica tu usuario o contraseña.');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return {
      user: this.formatUser(user),
      token
    };
  }

  /**
   * Get user profile by ID from token
   */
  static async getUserById(userId: number): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }
    return this.formatUser(user);
  }

  /**
   * Get public user profile by username with stats
   */
  static async getPublicProfile(username: string) {
    const cleanUser = username.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username: cleanUser },
      include: {
        playlists: {
          where: { isPublic: true },
          include: {
            songs: { take: 4 }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      throw new Error('Perfil no encontrado.');
    }

    return {
      user: this.formatUser(user),
      playlists: user.playlists.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        slug: p.slug,
        likesCount: p.likesCount,
        songsCount: p.songs.length,
        createdAt: p.createdAt.toISOString()
      }))
    };
  }

  /**
   * Update profile
   */
  static async updateProfile(userId: number, payload: UpdateProfilePayload): Promise<AuthUser> {
    const dataToUpdate: any = {};

    if (payload.avatar) {
      dataToUpdate.avatar = payload.avatar.trim();
    }

    if (typeof payload.bio === 'string') {
      dataToUpdate.bio = payload.bio.trim().substring(0, 500);
    }

    if (payload.username) {
      const cleanName = payload.username.trim().toLowerCase();
      if (cleanName.length < 3 || cleanName.length > 20) {
        throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres.');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanName)) {
        throw new Error('El nombre de usuario solo puede contener letras, números y guiones bajos.');
      }

      const existing = await prisma.user.findUnique({ where: { username: cleanName } });
      if (existing && existing.id !== userId) {
        throw new Error('Este nombre de usuario ya está en uso.');
      }
      dataToUpdate.username = cleanName;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    return this.formatUser(updated);
  }

  /**
   * Award DJ Score points to a registered user
   */
  static async awardDjPoints(userId: number, points: number): Promise<number> {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          djScore: {
            increment: points
          }
        }
      });
      return updated.djScore;
    } catch (err) {
      console.warn(`[AuthService] Could not award ${points} points to user ${userId}:`, err);
      return 0;
    }
  }
}
