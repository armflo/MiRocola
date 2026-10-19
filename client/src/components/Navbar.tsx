import React, { useState } from 'react';
import { Radio, Copy, Check, Users, Shield, LogOut, Settings, Lock, QrCode } from 'lucide-react';
import type { RoomState, User } from '@mirocola/shared';

interface NavbarProps {
  room: RoomState;
  currentUser: User | null;
  onOpenUsers: () => void;
  onOpenSettings?: () => void;
  onOpenQR?: () => void;
  onLeaveRoom: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  room,
  currentUser,
  onOpenUsers,
  onOpenSettings,
  onOpenQR,
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
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/40 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo and Room Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 tracking-tight text-base sm:text-lg">
                MiRocola
              </span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50">
                {room.mode === 'COLLABORATIVE' ? 'Colab' : 'DJ'}
              </span>
              {room.settings?.isQueueLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 font-semibold animate-pulse">
                  <Lock className="w-2.5 h-2.5 text-red-400" />
                  Cerrada
                </span>
              )}
            </div>
            <h1 className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[130px] sm:max-w-xs">
              {room.name}
            </h1>
          </div>
        </div>

        {/* Room Code Badge & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Room Code Button */}
          <button
            onClick={handleCopyCode}
            title="Haz clic para copiar el código de sala"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 border border-purple-800/40 hover:border-purple-500/70 text-slate-200 hover:text-white transition-all group cursor-pointer"
          >
            <span className="text-[10px] sm:text-xs text-purple-400 font-medium hidden sm:inline">
              CÓDIGO:
            </span>
            <span className="font-mono font-bold tracking-wider text-pink-400 text-xs sm:text-sm">
              {room.code}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-300 transition-colors" />
            )}
          </button>

          {/* QR Code button (scan to join) */}
          {onOpenQR && (
            <button
              onClick={onOpenQR}
              title="Mostrar Código QR para invitar amigos con su teléfono móvil"
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900/90 hover:bg-purple-950/60 border border-purple-800/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-pink-400" />
            </button>
          )}

          {/* Users button */}
          <button
            onClick={onOpenUsers}
            title="Ver amigos en la sala"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/40 text-purple-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{room.users.length}</span>
          </button>

          {/* Settings button (Host only) */}
          {isHost && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Configurar colores, duración y reglas de la sala"
              className="p-1.5 sm:p-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/50 text-pink-400 hover:text-white transition-colors cursor-pointer relative"
            >
              <Settings className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            </button>
          )}

          {/* User Avatar badge */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-500/40 bg-slate-800"
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
                <span className="text-[10px] text-purple-400 font-medium">
                  {currentUser.isHost ? 'DJ Anfitrión' : 'Oyente'}
                </span>
              </div>
            </div>
          )}

          {/* Leave Button */}
          <button
            onClick={onLeaveRoom}
            title="Salir de la sala"
            className="p-1.5 sm:p-2 rounded-lg bg-slate-900/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
