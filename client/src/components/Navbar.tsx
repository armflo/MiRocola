import React, { useState } from 'react';
import {
  Radio,
  Copy,
  Check,
  Users,
  Shield,
  LogOut,
  Settings,
  Lock,
  QrCode,
  Sparkles
} from 'lucide-react';
import type { RoomState, User, AuthUser } from '@mirocola/shared';

interface NavbarProps {
  room: RoomState;
  currentUser: User | null;
  authUser?: AuthUser | null;
  onOpenUsers: () => void;
  onOpenSettings?: () => void;
  onOpenQR?: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onLeaveRoom: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  room,
  currentUser,
  authUser,
  onOpenUsers,
  onOpenSettings,
  onOpenQR,
  onOpenAuth,
  onOpenProfile,
  onLeaveRoom
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = currentUser?.isHost ?? false;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/40 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-2.5">
      <div className="max-w-7xl mx-auto">
        {/* DESKTOP LAYOUT (sm:flex) */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          {/* Logo and Room Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 tracking-tight text-lg">
                  MiRocola
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50 font-medium">
                  {room.mode === 'COLLABORATIVE' ? 'Colab' : 'DJ'}
                </span>
                {room.settings?.isQueueLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 font-semibold animate-pulse">
                    <Lock className="w-2.5 h-2.5 text-red-400" />
                    Cerrada
                  </span>
                )}
              </div>
              <h1 className="text-sm font-semibold text-slate-200 truncate max-w-xs md:max-w-md">
                {room.name}
              </h1>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Room Code Button */}
            <button
              onClick={handleCopyCode}
              title="Haz clic para copiar el código de sala"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-purple-800/40 hover:border-purple-500/70 text-slate-200 hover:text-white transition-all group cursor-pointer"
            >
              <span className="text-xs text-purple-400 font-medium">CÓDIGO:</span>
              <span className="font-mono font-bold tracking-wider text-pink-400 text-sm">
                {room.code}
              </span>
              {copied ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Copiado
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-300 transition-colors" />
              )}
            </button>

            {/* QR Code button */}
            {onOpenQR && (
              <button
                onClick={onOpenQR}
                title="Mostrar Código QR para invitar amigos con su teléfono móvil"
                className="p-2 rounded-lg bg-slate-900/90 hover:bg-purple-950/60 border border-purple-800/40 text-pink-400 hover:text-white transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}

            {/* Users button */}
            <button
              onClick={onOpenUsers}
              title="Ver amigos en la sala"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/40 text-purple-200 text-sm font-medium transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>{room.users.length}</span>
            </button>

            {/* Settings button (Host only) */}
            {isHost && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Configurar colores, duración y reglas de la sala"
                className="p-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/50 text-pink-400 hover:text-white transition-colors cursor-pointer relative"
              >
                <Settings className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              </button>
            )}

            {/* User Profile badge (Registered User vs Guest) */}
            {authUser ? (
              <button
                onClick={onOpenProfile}
                title="Ver mi perfil y DJ Score"
                className="flex items-center gap-2 pl-2 border-l border-slate-800 hover:opacity-90 cursor-pointer text-left transition-opacity"
              >
                <div className="relative">
                  <img
                    src={authUser.avatar}
                    alt={authUser.username}
                    className="w-8 h-8 rounded-full border border-pink-500/70 bg-slate-800 object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">
                    ⭐
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none flex items-center gap-1">
                    @{authUser.username}
                    {currentUser?.isHost && (
                      <span title="Anfitrión de la sala">
                        <Shield className="w-3 h-3 text-amber-400" />
                      </span>
                    )}
                  </p>
                  <span className="text-[10px] text-amber-300 font-bold">
                    {authUser.djScore} pts
                  </span>
                </div>
              </button>
            ) : currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border border-purple-500/40 bg-slate-800 object-cover"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200 leading-none flex items-center gap-1">
                    {currentUser.name}
                    {currentUser.isHost && (
                      <span title="Anfitrión de la sala">
                        <Shield className="w-3 h-3 text-amber-400" />
                      </span>
                    )}
                  </p>
                  {onOpenAuth ? (
                    <button
                      onClick={onOpenAuth}
                      className="text-[10px] text-pink-400 hover:text-pink-300 font-semibold cursor-pointer underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Crear Cuenta</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-purple-400 font-medium">
                      {currentUser.isHost ? 'DJ Anfitrión' : 'Oyente'}
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Leave Button */}
            <button
              onClick={onLeaveRoom}
              title="Salir de la sala"
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MOBILE LAYOUT (sm:hidden) */}
        <div className="sm:hidden flex flex-col gap-2">
          {/* Row 1: Brand & Core Action Buttons */}
          <div className="flex items-center justify-between">
            {/* Brand & Badges */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/30 flex-shrink-0">
                <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 text-sm font-sans tracking-tight">
                MiRocola
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-800/50 font-medium">
                {room.mode === 'COLLABORATIVE' ? 'Colab' : 'DJ'}
              </span>
              {room.settings?.isQueueLocked && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-red-950/90 border border-red-800/60 text-red-300 font-semibold">
                  <Lock className="w-2.5 h-2.5 text-red-400" />
                  Cerrada
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* QR Button */}
              {onOpenQR && (
                <button
                  onClick={onOpenQR}
                  title="Código QR"
                  className="p-1.5 rounded-lg bg-slate-900 border border-purple-900/40 text-pink-400 active:bg-purple-950/60"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Users Button */}
              <button
                onClick={onOpenUsers}
                title="Ver amigos"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-200 text-xs font-semibold"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>{room.users.length}</span>
              </button>

              {/* Settings Button (Host only) */}
              {isHost && onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  title="Ajustes de la sala"
                  className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-700/50 text-pink-400 active:bg-purple-900 relative"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                </button>
              )}

              {/* Auth / Profile Button on Mobile */}
              {authUser && onOpenProfile ? (
                <button
                  onClick={onOpenProfile}
                  title="Mi Perfil DJ"
                  className="p-1 rounded-lg bg-slate-900 border border-pink-500/50 flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  <img
                    src={authUser.avatar}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span className="text-[10px] text-amber-300 font-bold hidden sm:inline">
                    ⭐{authUser.djScore}
                  </span>
                </button>
              ) : onOpenAuth ? (
                <button
                  onClick={onOpenAuth}
                  title="Crear Cuenta Gratis"
                  className="p-1 px-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold flex items-center gap-0.5 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Cuenta</span>
                </button>
              ) : null}

              {/* Leave Button */}
              <button
                onClick={onLeaveRoom}
                title="Salir de la sala"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Room Name & Room Code Pill */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-900/20">
            {/* Room Title */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xs font-semibold text-slate-200 truncate" title={room.name}>
                {room.name}
              </h1>
            </div>

            {/* Room Code Pill with Copy feedback */}
            <button
              onClick={handleCopyCode}
              title="Toca para copiar el código"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-purple-800/50 active:scale-95 transition-all text-xs flex-shrink-0 cursor-pointer"
            >
              <span className="text-[10px] text-purple-400 uppercase font-semibold">CÓDIGO:</span>
              <span className="font-mono font-bold text-pink-400 tracking-wider">
                {room.code}
              </span>
              {copied ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold animate-fade-in">
                  <Check className="w-3 h-3" />
                  Copiado
                </span>
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
