import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Maximize2,
  Minimize2,
  Tv,
  Users,
  Music,
  Disc3,
  Smartphone,
  Play,
  Pause,
  SkipForward,
  Mic2
} from 'lucide-react';
import type {
  RoomState,
  User,
  ReactionEvent,
  SoundboardEvent
} from '@mirocola/shared';
import { formatTime } from '../lib/utils';
import { THEMES } from '../lib/theme';
import { SOUND_EFFECTS } from '../lib/soundboard';
import { AudioVisualizer } from './AudioVisualizer';
import { KaraokeLyrics } from './KaraokeLyrics';

interface PartyTvModeProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomState;
  currentUser: User | null;
  reactions: ReactionEvent[];
  lastSoundEvent: SoundboardEvent | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
}

export const PartyTvMode: React.FC<PartyTvModeProps> = ({
  isOpen,
  onClose,
  room,
  currentUser,
  reactions,
  lastSoundEvent,
  onPlay,
  onPause,
  onNext
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [localTime, setLocalTime] = useState(0);

  const inviteUrl = `${window.location.origin}?code=${room.code}`;
  const currentSong = room.playback.currentSong;
  const isHost = currentUser?.isHost ?? false;
  const canControl = room.mode === 'COLLABORATIVE' || isHost;
  const theme = THEMES[room.settings?.theme || 'neon'] || THEMES.neon;

  // Generate QR Code
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(inviteUrl, {
        width: 280,
        margin: 1,
        color: {
          dark: '#020617',
          light: '#ffffff'
        }
      })
        .then((url) => setQrUrl(url))
        .catch(console.error);
    }
  }, [isOpen, inviteUrl]);

  // Keep track of playback elapsed time locally for TV progress bar
  useEffect(() => {
    if (!isOpen) return;

    const baseTime = room.playback.currentTime;
    const baseTimestamp = room.playback.timestamp;
    const isPlaying = room.playback.isPlaying;

    const interval = setInterval(() => {
      if (isPlaying) {
        const elapsed = (Date.now() - baseTimestamp) / 1000;
        setLocalTime(baseTime + elapsed);
      } else {
        setLocalTime(baseTime);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen, room.playback]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard shortcut: Escape exits
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const duration = currentSong?.durationSeconds || 0;
  const progressPercent = duration > 0 ? Math.min(100, (localTime / duration) * 100) : 0;
  const nextSongs = room.queue.slice(0, 3);

  const activeSoundMeta = lastSoundEvent
    ? SOUND_EFFECTS.find((s) => s.id === lastSoundEvent.soundId)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none animate-fade-in"
      style={{ backgroundColor: theme.bgDark }}
    >
      {/* Background Ambient Glows */}
      <div
        className="fixed -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[160px] pointer-events-none -z-10"
        style={{ backgroundColor: theme.glow1 }}
      />
      <div
        className="fixed -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] pointer-events-none -z-10"
        style={{ backgroundColor: theme.glow2 }}
      />

      {/* Floating Reactions on TV */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-32 text-5xl animate-float-up"
            style={{
              left: `${20 + (parseInt(r.id.slice(-2), 16) % 60)}%`
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Floating Soundboard Banner on TV */}
      {lastSoundEvent && activeSoundMeta && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="flex items-center gap-3 px-6 py-3 rounded-3xl bg-slate-900/95 border-2 border-pink-500 shadow-2xl backdrop-blur-xl">
            <span className="text-4xl">{activeSoundMeta.emoji}</span>
            <div className="text-left leading-tight">
              <span className="text-xs font-bold text-pink-400">
                {lastSoundEvent.user.name}
              </span>
              <p className="text-base text-white font-extrabold">
                ¡Tocó {activeSoundMeta.name}!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300">
                {room.name}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950/80 border border-pink-700/60 text-pink-300 font-extrabold tracking-wider uppercase">
                Modo Fiesta TV
              </span>
            </div>
            <p className="text-xs text-slate-400">
              MiRocola — Música sincronizada en vivo
            </p>
          </div>
        </div>

        {/* Top Right Controls: Listeners count, Karaoke toggle, Fullscreen toggle, Close */}
        <div className="flex items-center gap-2.5">
          {currentSong && (
            <button
              onClick={() => setShowKaraoke(!showKaraoke)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-md ${
                showKaraoke
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-pink-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-purple-800/40 text-pink-300'
              }`}
              title="Activar Karaoke Sincronizado en Pantalla Gigante"
            >
              <Mic2 className="w-4 h-4 text-pink-300 animate-pulse" />
              <span>Karaoke</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-800/40 text-purple-200 text-xs font-bold">
            <Users className="w-4 h-4 text-purple-400" />
            <span>{room.users.length} en la fiesta</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-purple-950/60 border border-purple-800/40 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            title="Salir del Modo TV (o presiona Esc)"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-red-950/60 border border-slate-800 hover:border-red-800/60 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CENTER STAGE (Main visualizer / Karaoke / YouTube Stage) */}
      <div className="flex-1 my-auto flex items-center justify-center p-2 z-10 max-h-[62vh] w-full">
        {currentSong ? (
          showKaraoke ? (
            <div className="w-full max-w-4xl h-[56vh]">
              <KaraokeLyrics
                title={currentSong.title}
                channelTitle={currentSong.channelTitle}
                durationSeconds={duration}
                currentTime={localTime}
                isPlaying={room.playback.isPlaying}
                onSeek={canControl ? onPlay : undefined}
                onClose={() => setShowKaraoke(false)}
                isTvMode={true}
              />
            </div>
          ) : (
            <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-purple-800/40 bg-black flex items-center justify-center">
              {/* Ambient artwork backdrop */}
              <img
                src={currentSong.thumbnail}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
              />

              {/* Vinyl Record Center Animation */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
                <div
                  className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center bg-black overflow-hidden mb-6 ${
                    room.playback.isPlaying ? 'animate-spin-slow' : ''
                  }`}
                >
                  {/* Vinyl Grooves */}
                  <div className="absolute inset-2 rounded-full border border-slate-800" />
                  <div className="absolute inset-6 rounded-full border border-slate-800/80" />
                  <div className="absolute inset-10 rounded-full border border-slate-800/60" />
                  <div className="absolute inset-14 rounded-full border border-slate-800/40" />

                  {/* Center Label with Thumbnail */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-pink-500 shadow-lg relative">
                    <img
                      src={currentSong.thumbnail}
                      alt={currentSong.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-4 h-4 rounded-full bg-slate-900 border border-white" />
                    </div>
                  </div>
                </div>

                {/* Title & Channel */}
                <h2 className="text-xl sm:text-3xl font-black text-white max-w-xl truncate drop-shadow-md">
                  {currentSong.title}
                </h2>
                <p className="text-sm sm:text-base text-pink-300 font-semibold mt-1">
                  {currentSong.channelTitle}
                </p>
              </div>

              {/* Reactive Equalizer Bars at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-16 opacity-30 pointer-events-none">
                <AudioVisualizer isPlaying={room.playback.isPlaying} barCount={56} colorScheme="neon" />
              </div>
            </div>
          )
        ) : (
          <div className="text-center p-8 rounded-3xl bg-slate-900/60 border border-purple-900/40 backdrop-blur-xl max-w-md">
            <Disc3 className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-xl font-bold text-white mb-2">
              ¡La rocola está esperando música!
            </h3>
            <p className="text-xs text-slate-400">
              Usa tu teléfono móvil para escanear el código QR de abajo y ser el primero en poner una canción.
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL & PARTY DASHBOARD */}
      <footer className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center z-20">
        {/* Left Col (4 cols): Giant Guest QR Card */}
        <div className="md:col-span-4 flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border-2 border-pink-500/60 shadow-xl backdrop-blur-xl">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR para unirse"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white p-1 flex-shrink-0 shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-800 animate-pulse flex-shrink-0" />
          )}

          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 text-[10px] text-pink-400 font-bold uppercase tracking-wider mb-0.5">
              <Smartphone className="w-3 h-3" />
              <span>Pide canciones desde tu celular</span>
            </div>
            <p className="text-xs text-slate-300 leading-tight">
              Apunta tu cámara al QR o entra con el código:
            </p>
            <div className="mt-1 inline-block px-2.5 py-0.5 rounded-lg bg-pink-950/80 border border-pink-700/60 font-mono font-black text-pink-300 text-sm tracking-widest">
              {room.code}
            </div>
          </div>
        </div>

        {/* Center Col (5 cols): Player Timeline & Controls */}
        <div className="md:col-span-5 p-3.5 rounded-2xl bg-slate-900/80 border border-purple-900/40 shadow-xl backdrop-blur-xl flex flex-col gap-2">
          {currentSong ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-xs truncate">
                    {currentSong.title}
                  </p>
                  <p className="text-[10px] text-purple-300 truncate">
                    Pedida por: <span className="font-semibold text-white">{currentSong.addedBy.name}</span>
                  </p>
                </div>

                {canControl && (
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={room.playback.isPlaying ? onPause : onPlay}
                      className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {room.playback.isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={onNext}
                      className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Siguiente canción"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>{formatTime(localTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">
              Sin reproducción activa
            </p>
          )}
        </div>

        {/* Right Col (3 cols): Up Next songs ticker */}
        <div className="md:col-span-3 p-3 rounded-2xl bg-slate-900/80 border border-purple-900/40 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            <Music className="w-3.5 h-3.5 text-pink-400" />
            <span>Por sonar ({room.queue.length})</span>
          </div>

          {nextSongs.length === 0 ? (
            <p className="text-[10px] text-slate-500 py-1">
              No hay canciones en cola. ¡Escanea el QR y pide la tuya!
            </p>
          ) : (
            <div className="space-y-1">
              {nextSongs.map((song, i) => (
                <div key={song.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-[9px] font-mono text-slate-500 w-3">{i + 1}</span>
                  <p className="truncate text-slate-300 flex-1 font-medium">{song.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
