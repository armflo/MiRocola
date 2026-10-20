import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Loader2,
  Sparkles,
  Dice5,
  ShieldCheck,
  Disc3,
  Award,
  Share2
} from 'lucide-react';
import type { AuthUser } from '@mirocola/shared';
import { authService } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
  onSuccess?: (user: AuthUser) => void;
  initialTab?: 'login' | 'register';
}

const AVATAR_SEEDS = [
  'Rockstar',
  'NeonDJ',
  'Synthwave',
  'Galaxy',
  'RetroBeat',
  'Cyberpunk',
  'DiscoKing',
  'Midnight'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onSuccess,
  initialTab = 'register'
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(AVATAR_SEEDS[0]);

  if (!isOpen) return null;

  const currentAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (tab === 'register') {
        const res = await authService.register({
          email,
          username,
          password,
          avatar: currentAvatarUrl
        });

        if (res.success && res.user) {
          onAuthSuccess?.(res.user);
          onSuccess?.(res.user);
          onClose();
        } else {
          setError(res.error || 'Error al crear la cuenta');
        }
      } else {
        const res = await authService.login({
          emailOrUsername: email, // Can be username or email
          password
        });

        if (res.success && res.user) {
          onAuthSuccess?.(res.user);
          onSuccess?.(res.user);
          onClose();
        } else {
          setError(res.error || 'Credenciales incorrectas');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomizeAvatar = () => {
    const random = `DJ_${Math.random().toString(36).substring(2, 7)}`;
    setAvatarSeed(random);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-slate-900/95 border border-purple-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Brand */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/30 mb-2.5">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
            {tab === 'register' ? 'Crea tu Cuenta en MiRocola' : 'Bienvenido de Vuelta'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {tab === 'register'
              ? 'El registro es 100% opcional y desbloquea beneficios exclusivos'
              : 'Accede a tus playlists guardadas y tu DJ Score'}
          </p>
        </div>

        {/* Benefits banner (shown on register tab) */}
        {tab === 'register' && (
          <div className="mb-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <Disc3 className="w-4 h-4 text-pink-400 mb-1" />
              <span>Tus Playlists</span>
            </div>
            <div className="flex flex-col items-center">
              <Award className="w-4 h-4 text-amber-400 mb-1" />
              <span>DJ Score ⭐</span>
            </div>
            <div className="flex flex-col items-center">
              <Share2 className="w-4 h-4 text-cyan-400 mb-1" />
              <span>Compartir</span>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950/80 rounded-xl mb-5 border border-purple-900/40">
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Crear Cuenta
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-200 flex items-center gap-2 animate-fade-in">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <>
              {/* Avatar Picker */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/60 border border-purple-900/30">
                <img
                  src={currentAvatarUrl}
                  alt="Avatar"
                  className="w-12 h-12 rounded-xl border border-pink-500/50 bg-slate-900 p-0.5 object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-300 block">Tu Avatar DJ</span>
                  <div className="flex items-center gap-1.5 mt-1 overflow-x-auto scrollbar-none py-0.5">
                    {AVATAR_SEEDS.slice(0, 5).map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setAvatarSeed(seed)}
                        className={`w-6 h-6 rounded-lg overflow-hidden border cursor-pointer transition-all ${
                          avatarSeed === seed ? 'border-pink-500 scale-110' : 'border-slate-800 opacity-60'
                        }`}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`}
                          alt=""
                          className="w-full h-full"
                        />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleRandomizeAvatar}
                      title="Aleatorio"
                      className="p-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-pink-400 text-[10px] flex items-center gap-0.5 cursor-pointer flex-shrink-0"
                    >
                      <Dice5 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="ej. armando_dj"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/40 text-xs focus:outline-none focus:border-pink-500 text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email / Username field */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              {tab === 'register' ? 'Correo Electrónico' : 'Usuario o Correo Electrónico'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type={tab === 'register' ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tab === 'register' ? 'tu@correo.com' : 'tu_usuario o tu@correo.com'}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/40 text-xs focus:outline-none focus:border-pink-500 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-purple-900/40 text-xs focus:outline-none focus:border-pink-500 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 font-bold text-xs text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{tab === 'register' ? 'Crear mi Cuenta Gratis' : 'Iniciar Sesión'}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-500 mt-4">
          {tab === 'register' ? (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => setTab('login')}
                className="text-pink-400 hover:text-pink-300 font-bold cursor-pointer underline"
              >
                Inicia sesión aquí
              </button>
            </>
          ) : (
            <>
              ¿No tienes cuenta?{' '}
              <button
                onClick={() => setTab('register')}
                className="text-pink-400 hover:text-pink-300 font-bold cursor-pointer underline"
              >
                Regístrate gratis
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
