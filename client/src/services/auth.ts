import type {
  AuthUser,
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload
} from '@mirocola/shared';
import { BACKEND_URL } from './socket';

const TOKEN_KEY = 'mirocola_auth_token';
const USER_KEY = 'mirocola_auth_user';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  hasSession(): boolean {
    return !!this.getToken();
  },

  getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  saveSession(token: string, user: AuthUser) {
    this.setSession(token, user);
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  logout() {
    this.clearSession();
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
        return { success: true, user: data.user, token: data.token };
      }
      return { success: false, error: data.error || 'Error al registrar usuario' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión con el servidor' };
    }
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
        return { success: true, user: data.user, token: data.token };
      }
      return { success: false, error: data.error || 'Credenciales incorrectas' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión con el servidor' };
    }
  },

  async getMe(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          return data.user;
        }
      }
      // If unauthorized, clear
      if (res.status === 401) {
        this.clearSession();
      }
    } catch {
      // Offline fallback: return cached user
      return this.getStoredUser();
    }
    return null;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'No autenticado' };

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Error al actualizar perfil' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión' };
    }
  }
};
