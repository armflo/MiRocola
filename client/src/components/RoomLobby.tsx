import React, { useState } from 'react';
import { Users, Disc3, Sparkles, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import type { RoomMode } from '@mirocola/shared';

interface RoomLobbyProps {
  onCreateRoom: (roomName: string, userName: string, avatar: string, mode: RoomMode) => void;
  onJoinRoom: (code: string, userName: string, avatar: string) => void;
  isLoading: boolean;
  error?: string | null;
}

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Milo', 'Luna', 'Zoe', 'Leo', 'Maya', 'Nico'];

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomMode, setRoomMode] = useState<RoomMode>('COLLABORATIVE');
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`;

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Hero header */}
      <div className="text-center mb-8 relative z-10">
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
        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-purple-900/30 mb-6">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
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
            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
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
          {/* Avatar picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Elige tu avatar
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                const isSelected = selectedAvatarSeed === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedAvatarSeed(seed)}
                    className={`relative flex-shrink-0 w-11 h-11 rounded-xl p-0.5 border-2 transition-all ${
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
                    className={`p-2.5 rounded-xl border text-left transition-all ${
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
                    className={`p-2.5 rounded-xl border text-left transition-all ${
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
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{tab === 'create' ? 'Crear Rocola' : 'Entrar a la Rocola'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        <p>MiRocola — Desarrollado con React, TypeScript, Node.js y MySQL</p>
      </footer>
    </div>
  );
};
