import React, { useState } from 'react';
import { Radio, Copy, Check, Users, Shield, LogOut } from 'lucide-react';
import type { RoomState, User } from '@mirocola/shared';

interface NavbarProps {
  room: RoomState;
  currentUser: User | null;
  onOpenUsers: () => void;
  onLeaveRoom: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  room,
  currentUser,
  onOpenUsers,
  onLeaveRoom
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/40 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo and Room Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 tracking-tight text-lg">
                MiRocola
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50">
                {room.mode === 'COLLABORATIVE' ? 'Colaborativo' : 'Modo DJ'}
              </span>
            </div>
            <h1 className="text-sm font-semibold text-slate-200 truncate max-w-[180px] sm:max-w-xs">
              {room.name}
            </h1>
          </div>
        </div>

        {/* Room Code Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Room Code Button */}
          <button
            onClick={handleCopyCode}
            title="Haz clic para copiar el código de sala"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-purple-800/40 hover:border-purple-500/70 text-slate-200 hover:text-white transition-all group"
          >
            <span className="text-xs text-purple-400 font-medium hidden sm:inline">CÓDIGO:</span>
            <span className="font-mono font-bold tracking-widest text-pink-400 text-sm">
              {room.code}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400 group-hover:text-purple-300 transition-colors" />
            )}
          </button>

          {/* Users button */}
          <button
            onClick={onOpenUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/40 text-purple-200 text-sm font-medium transition-colors"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>{room.users.length}</span>
          </button>

          {/* User Avatar badge */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-purple-500/40 bg-slate-800"
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
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
