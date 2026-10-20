import React, { useState, useEffect } from 'react';
import {
  Users,
  Disc3,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  LogIn,
  Radio,
  RefreshCw,
  Music2,
  Play
} from 'lucide-react';
import type { RoomMode, AuthUser } from '@mirocola/shared';
import { getDjRank } from '../lib/djRank';
import { BACKEND_URL } from '../services/socket';

interface PublicRoomItem {
  code: string;
  name: string;
  userCount: number;
  currentSong: {
    title: string;
    channelTitle: string;
    thumbnail: string;
  } | null;
  mode: RoomMode;
}

interface RoomLobbyProps {
  onCreateRoom: (roomName: string, userName: string, avatar: string, mode: RoomMode) => void;
  onJoinRoom: (code: string, userName: string, avatar: string) => void;
  isLoading: boolean;
  error?: string | null;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
}

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Milo', 'Luna', 'Zoe', 'Leo', 'Maya', 'Nico'];

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error,
  authUser,
  onOpenAuth,
  onOpenProfile
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [userName, setUserName] = useState(authUser?.username || '');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomMode, setRoomMode] = useState<RoomMode>('COLLABORATIVE');
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [slowConnecting, setSlowConnecting] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomItem[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const fetchPublicRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setPublicRooms(data.rooms);
        }
      }
    } catch {
      // Quiet fail if server waking up
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 12000);
    return () => clearInterval(interval);
  }, []);

  // Monitor loading time to display friendly Render wake-up hint
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setSlowConnecting(true), 2500);
    } else {
      setSlowConnecting(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // If authUser changes or is loaded, prefill username if empty
  useEffect(() => {
    if (authUser?.username && !userName) {
      setUserName(authUser.username);
    }
  }, [authUser]);

  // Read ?code=... or ?join=... from URL (e.g. from QR scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('join');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase().trim());
      setTab('join');
    }
  }, []);

  const avatarUrl = authUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    if (tab === 'create') {
      onCreateRoom(
        roomName.trim() || `Rocola de ${userName}`,
        userName.trim(),
        avatarUrl,
        roomMode
      );
    } else {
      if (!roomCode.trim()) return;
      onJoinRoom(roomCode.trim(), userName.trim(), avatarUrl);
    }
  };

  const rank = authUser ? getDjRank(authUser.djScore) : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar for Auth / Profile Access */}
      <div className="w-full max-w-md flex justify-end mb-3 relative z-10">
        {authUser ? (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-purple-800/50 hover:border-pink-500/60 shadow-lg text-xs font-semibold text-slate-200 cursor-pointer transition-all hover:scale-105"
          >
            <img
              src={authUser.avatar}
              alt={authUser.username}
              className="w-5 h-5 rounded-full object-cover border border-pink-400"
            />
            <span>@{authUser.username}</span>
            <span className="text-amber-400 font-bold">⭐ {authUser.djScore}</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-700/50 hover:border-pink-500/70 text-xs font-semibold text-purple-200 hover:text-white cursor-pointer transition-all hover:scale-105 shadow-md"
          >
            <LogIn className="w-3.5 h-3.5 text-pink-400" />
            <span>Iniciar Sesión / Registro</span>
          </button>
        )}
      </div>

      {/* Hero header */}
      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/40 text-purple-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          Rocola Colaborativa en Tiempo Real
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 tracking-tight">
          MiRocola
        </h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-md mx-auto">
          Crea una sala, comparte el código con tus amigos y disfruten de su música favorita sincronizada al segundo.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-purple-900/50 rounded-2xl shadow-2xl shadow-purple-950/50 backdrop-blur-xl p-6 sm:p-8 relative z-10">
        {/* Auth Status Banner */}
        {authUser && rank ? (
          <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-purple-950/70 to-pink-950/50 border border-purple-700/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={authUser.avatar}
                alt={authUser.username}
                className="w-10 h-10 rounded-full border-2 border-pink-500/80 object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white truncate">
                    @{authUser.username}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border bg-gradient-to-r ${rank.badgeClass}`}
                  >
                    {rank.emoji} {rank.name}
                  </span>
                </div>
                <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1 mt-0.5">
                  ⭐ {authUser.djScore} puntos de DJ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800/70 border border-purple-700/50 text-[11px] font-semibold text-purple-200 transition-colors cursor-pointer flex-shrink-0"
            >
              Mi Perfil
            </button>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-left min-w-0">
              <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0 animate-pulse" />
              <div className="text-[11px] text-slate-300 leading-tight">
                <span className="font-bold text-white">¿Quieres guardar tus rocolas?</span>
                <p className="text-slate-400 text-[10px]">Crea una cuenta gratis o juega como invitado.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold shadow hover:opacity-95 transition-all cursor-pointer flex-shrink-0"
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-purple-900/30 mb-6">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'create'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-4 h-4" />
            Crear Sala
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'join'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Unirme a Sala
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar picker (if not logged in, or logged in without custom avatar) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Elige tu avatar
              </label>
              {authUser && (
                <span className="text-[10px] text-pink-400 font-medium">
                  Avatar de tu cuenta activo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {authUser && (
                <button
                  type="button"
                  onClick={() => setSelectedAvatarSeed(authUser.username)}
                  className={`relative flex-shrink-0 w-11 h-11 rounded-xl p-0.5 border-2 transition-all cursor-pointer ${
                    avatarUrl === authUser.avatar
                      ? 'border-pink-500 bg-pink-950/40 scale-105 shadow-md shadow-pink-500/20'
                      : 'border-slate-800 bg-slate-900/60 opacity-70'
                  }`}
                  title="Tu avatar registrado"
                >
                  <img src={authUser.avatar} alt="Registrado" className="w-full h-full rounded-lg object-cover" />
                </button>
              )}
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                const isSelected = !authUser && selectedAvatarSeed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedAvatarSeed(seed)}
                    className={`relative flex-shrink-0 w-11 h-11 rounded-xl p-0.5 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-pink-500 bg-pink-950/40 scale-105 shadow-md shadow-pink-500/20'
                        : 'border-slate-800 bg-slate-900/60 hover:border-purple-600/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={seed} className="w-full h-full rounded-lg" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tu Nombre o Apodo *
            </label>
            <input
              type="text"
              required
              maxLength={25}
              placeholder="Ej. Armando DJ"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/50 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition-all"
            />
          </div>

          {/* Create Room Specific Fields */}
          {tab === 'create' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre de la Sala
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="Ej. Noche de Rocola & Amigos"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/50 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>

              {/* Room Mode selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Modo de Sala
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoomMode('COLLABORATIVE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      roomMode === 'COLLABORATIVE'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-purple-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-pink-400" />
                      Colaborativo
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Todos pueden controlar la música y agregar temas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomMode('DJ_ONLY')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      roomMode === 'DJ_ONLY'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-purple-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Modo DJ
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Solo tú controlas la reproducción; amigos solo piden canciones.
                    </p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Join Room Specific Fields */
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código de la Sala *
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Ej. ABCD12"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 font-mono text-center tracking-widest text-lg font-bold rounded-xl bg-slate-950 border border-purple-900/50 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-pink-400 placeholder-slate-600 outline-none uppercase transition-all"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !userName.trim() || (tab === 'join' && !roomCode.trim())}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs">
                  {slowConnecting ? 'Despertando servidor...' : 'Conectando...'}
                </span>
              </div>
            ) : (
              <>
                <span>{tab === 'create' ? 'Crear Rocola' : 'Entrar a la Rocola'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {slowConnecting && (
            <p className="text-[11px] text-amber-300 text-center animate-pulse leading-snug px-2">
              ⏳ El servidor gratuito de Render se suspende tras inactividad. Se está iniciando el contenedor (toma ~25-30s la primera vez)...
            </p>
          )}
        </form>
      </div>

      {/* Directory of Live Public Rooms */}
      <div className="w-full max-w-md mt-6 relative z-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Salas Activas en Vivo {publicRooms.length > 0 && `(${publicRooms.length})`}
            </h3>
          </div>
          <button
            type="button"
            onClick={fetchPublicRooms}
            disabled={isLoadingRooms}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Actualizar lista de salas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin text-pink-400' : ''}`} />
          </button>
        </div>

        {publicRooms.length > 0 ? (
          <div className="space-y-2.5">
            {publicRooms.map((room) => (
              <div
                key={room.code}
                onClick={() => {
                  setRoomCode(room.code);
                  setTab('join');
                  if (userName.trim()) {
                    onJoinRoom(room.code, userName.trim(), avatarUrl);
                  }
                }}
                className="group p-3 rounded-2xl bg-slate-900/90 hover:bg-purple-950/40 border border-purple-900/40 hover:border-pink-500/60 shadow-lg backdrop-blur-xl transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {room.currentSong?.thumbnail ? (
                    <img
                      src={room.currentSong.thumbnail}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover border border-purple-800/40 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-pink-400 flex-shrink-0">
                      <Music2 className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                        {room.name}
                      </h4>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-pink-400 border border-purple-900/50">
                        {room.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {room.currentSong ? room.currentSong.title : 'En silencio esperando temas'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/40 flex items-center gap-1">
                    <Users className="w-3 h-3 text-pink-400" />
                    {room.userCount}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-pink-600/80 group-hover:bg-pink-600 text-white flex items-center justify-center shadow transition-all">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-purple-900/30 text-center text-slate-400 text-xs">
            <Radio className="w-6 h-6 text-purple-500/70 mx-auto mb-1.5" />
            <p className="font-medium text-slate-300">No hay salas abiertas en este instante</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ¡Sé el primero en encender la fiesta creando tu propia sala arriba!
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        <p>MiRocola — Desarrollado con React, TypeScript, Node.js y MySQL</p>
      </footer>
    </div>
  );
};
