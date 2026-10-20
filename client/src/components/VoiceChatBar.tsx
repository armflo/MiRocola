import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Loader2
} from 'lucide-react';
import type { VoiceUser, User } from '@mirocola/shared';
import { voiceManager } from '../services/voiceService';

interface VoiceChatBarProps {
  roomCode: string;
  currentUser: User | null;
  className?: string;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  roomCode,
  currentUser,
  className = ''
}) => {
  const [isConnected, setIsConnected] = useState(voiceManager.isConnected);
  const [isMuted, setIsMuted] = useState(voiceManager.isMuted);
  const [isDeafened, setIsDeafened] = useState(voiceManager.isDeafened);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    voiceManager.setListeners({
      onUsersChange: (users) => {
        setVoiceUsers(users);
        setIsConnected(voiceManager.isConnected);
      },
      onSpeakingChange: (speaking) => {
        setIsSpeaking(speaking);
      },
      onError: (msg) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    });

    return () => {
      // Don't necessarily disconnect on re-render
    };
  }, []);

  const handleToggleConnect = async () => {
    if (!currentUser) return;
    if (isConnected) {
      voiceManager.leave();
      setIsConnected(false);
    } else {
      setIsConnecting(true);
      const ok = await voiceManager.join(roomCode, {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      });
      setIsConnecting(false);
      setIsConnected(ok);
      if (ok) {
        setIsMuted(false);
        setIsDeafened(false);
      }
    }
  };

  const handleToggleMute = () => {
    const muted = voiceManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleDeafen = () => {
    const deafened = voiceManager.toggleDeafen();
    setIsDeafened(deafened);
  };

  return (
    <div
      className={`w-full rounded-2xl bg-slate-900/90 border border-purple-800/40 backdrop-blur-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 transition-all ${className}`}
    >
      {/* Left: Info & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2 rounded-xl flex items-center justify-center transition-all ${
            isConnected
              ? isSpeaking
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 animate-pulse scale-105'
                : 'bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-md'
              : 'bg-purple-950/70 text-purple-300 border border-purple-800/40'
          }`}
        >
          {isConnected ? (
            <Radio className="w-4 h-4 animate-spin-slow" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white truncate">
              {isConnected ? 'Voz en Vivo: Conectado' : 'Chat de Voz / Karaoke Party'}
            </h4>
            {isConnected && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                EN VIVO
              </span>
            )}
          </div>
          <p className="text-[11px] text-purple-300 truncate">
            {isConnected
              ? `${voiceUsers.length} participante${voiceUsers.length === 1 ? '' : 's'} cantando y hablando`
              : 'Únete para cantar juntos con el karaoke en tiempo real'}
          </p>
        </div>
      </div>

      {/* Center: Avatars of Participants in Voice */}
      {voiceUsers.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {voiceUsers.map((u) => {
            const isMe = u.userId === currentUser?.id;
            const speakingNow = isMe ? isSpeaking : u.isSpeaking;

            return (
              <div
                key={u.socketId}
                className="relative group cursor-pointer"
                title={`${u.userName} ${u.isMuted ? '(Silenciado)' : ''}`}
              >
                <img
                  src={u.avatar}
                  alt={u.userName}
                  className={`w-7 h-7 rounded-full object-cover border-2 transition-all ${
                    speakingNow
                      ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-110'
                      : u.isMuted
                      ? 'border-red-500/60 opacity-60'
                      : 'border-purple-500/60'
                  }`}
                />
                {u.isMuted && (
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px]">
                    <MicOff className="w-2 h-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Right: Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isConnected ? (
          <>
            {/* Mute Mic */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isMuted
                  ? 'bg-red-950/80 border-red-700/80 text-red-300 hover:bg-red-900/90'
                  : isSpeaking
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-white'
              }`}
              title={isMuted ? 'Activar Micrófono' : 'Silenciar Micrófono'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
              <span className="text-xs hidden sm:inline">{isMuted ? 'Mute' : 'Hablar'}</span>
            </button>

            {/* Deafen (Mute Others) */}
            <button
              onClick={handleToggleDeafen}
              className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                isDeafened
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                  : 'bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-slate-300'
              }`}
              title={isDeafened ? 'Escuchar a los demás' : 'Ensordecer (no escuchar voz)'}
            >
              {isDeafened ? (
                <VolumeX className="w-4 h-4 text-amber-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Disconnect Voice */}
            <button
              onClick={handleToggleConnect}
              className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-all cursor-pointer flex items-center gap-1 shadow"
              title="Salir del chat de voz"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Salir</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleToggleConnect}
            disabled={isConnecting || !currentUser}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            <span>{isConnecting ? 'Conectando...' : 'Unirme a Voz'}</span>
          </button>
        )}
      </div>

      {/* Error message popover */}
      {errorMessage && (
        <div className="w-full text-center text-xs text-red-300 bg-red-950/60 border border-red-800/40 p-2 rounded-xl animate-shake">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
