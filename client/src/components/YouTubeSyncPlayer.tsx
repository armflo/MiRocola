import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  Video,
  VideoOff,
  Flame,
  Music2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Mic2,
  Tv,
  Users,
  Maximize2,
  Minimize2,
  X,
  Smartphone,
  Music,
  RefreshCw
} from 'lucide-react';
import type {
  PlaybackState,
  User,
  RoomMode,
  RoomSettings,
  Song,
  ReactionEvent,
  SoundboardEvent
} from '@mirocola/shared';
import { socket } from '../services/socket';
import { formatTime } from '../lib/utils';
import { SOUND_EFFECTS } from '../lib/soundboard';
import { AudioVisualizer } from './AudioVisualizer';
import { KaraokeLyrics } from './KaraokeLyrics';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeSyncPlayerProps {
  playback: PlaybackState;
  currentUser: User | null;
  roomMode: RoomMode;
  roomSettings?: RoomSettings;
  isHost: boolean;
  skipVotes: string[];
  requiredSkipVotes: number;
  onPlay: (currentTime?: number) => void;
  onPause: (currentTime?: number) => void;
  onSeek: (time: number) => void;
  onNext: () => void;
  onVoteSkip: () => void;
  onOpenAddModal: () => void;
  // TV Mode Props
  isTvMode?: boolean;
  onCloseTvMode?: () => void;
  roomCode?: string;
  roomName?: string;
  usersCount?: number;
  queue?: Song[];
  reactions?: ReactionEvent[];
  lastSoundEvent?: SoundboardEvent | null;
  inactivityWarning?: { remainingSeconds: number } | null;
  onKeepAlive?: () => void;
}

export const YouTubeSyncPlayer: React.FC<YouTubeSyncPlayerProps> = ({
  playback,
  currentUser,
  roomMode,
  roomSettings,
  isHost,
  skipVotes,
  requiredSkipVotes,
  onPlay,
  onPause,
  onSeek,
  onNext,
  onVoteSkip,
  onOpenAddModal,
  isTvMode = false,
  onCloseTvMode,
  roomCode,
  roomName,
  usersCount,
  queue,
  reactions,
  lastSoundEvent,
  inactivityWarning,
  onKeepAlive
}) => {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate QR Code for TV mode
  useEffect(() => {
    if (roomCode) {
      const inviteUrl = `${window.location.origin}?code=${roomCode}`;
      QRCode.toDataURL(inviteUrl, {
        width: 280,
        margin: 1,
        color: { dark: '#020617', light: '#ffffff' }
      })
        .then((url) => setQrUrl(url))
        .catch(console.error);
    }
  }, [roomCode]);

  // Fullscreen toggle for TV Mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };
  const [playbackError, setPlaybackError] = useState<{
    code: number;
    title: string;
    message: string;
    countdown: number;
  } | null>(null);
  const [isSearchingFallback, setIsSearchingFallback] = useState(false);
  const [fallbackStatus, setFallbackStatus] = useState<string | null>(null);

  const canControl = roomMode === 'COLLABORATIVE' || isHost;
  const currentSong = playback.currentSong;
  const hasVotedSkip = currentUser ? skipVotes.includes(currentUser.id) : false;

  const handleFindAlternative = (songToReplace: Song) => {
    if (isSearchingFallback) return;
    setIsSearchingFallback(true);
    setFallbackStatus('Buscando versión de audio o karaoke sin restricciones...');

    const cleanTitle = songToReplace.title
      .replace(/(\[.*?\]|\(.*?\)|official\s+video|video\s+oficial|videoclip|audio\s+oficial)/gi, '')
      .trim();
    const query = `${cleanTitle} audio`;

    socket.emit('youtube:search', query, (res) => {
      if (res.success && res.results && res.results.length > 0) {
        const alt = res.results.find((r) => r.youtubeId !== songToReplace.youtubeId) || res.results[0];
        if (alt && alt.youtubeId !== songToReplace.youtubeId) {
          setFallbackStatus(`¡Versión alternativa encontrada! Reemplazando por "${alt.title}"...`);
          socket.emit(
            'playback:fallbackSong',
            {
              alternativeYoutubeId: alt.youtubeId,
              title: alt.title,
              channelTitle: alt.channelTitle,
              duration: alt.durationSeconds,
              thumbnail: alt.thumbnail
            },
            () => {
              setIsSearchingFallback(false);
              setPlaybackError(null);
              setFallbackStatus(null);
            }
          );
          return;
        }
      }
      setFallbackStatus('No se encontró una versión alternativa automática. Puedes saltar la canción.');
      setIsSearchingFallback(false);
    });
  };

  // Clear playback error when current song changes
  useEffect(() => {
    setPlaybackError(null);
    setFallbackStatus(null);
  }, [currentSong?.youtubeId]);

  // Countdown timer for automatic skipping of unplayable videos
  useEffect(() => {
    if (!playbackError) return;
    if (playbackError.countdown <= 0) {
      if (canControl) {
        onNext();
      }
      return;
    }

    const timer = setTimeout(() => {
      setPlaybackError((prev) =>
        prev ? { ...prev, countdown: prev.countdown - 1 } : null
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [playbackError, canControl, onNext]);

  // Initialize YouTube Iframe API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('yt-player-frame', {
        height: '100%',
        width: '100%',
        videoId: currentSong?.youtubeId || '',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            // If video naturally ended, trigger next
            if (event.data === window.YT.PlayerState.ENDED) {
              if (canControl) {
                onNext();
              }
            }
          },
          onError: (event: any) => {
            const code = event.data;
            console.warn('[YouTube Player] Playback error code:', code);
            let title = 'Video no disponible';
            let message = 'Este video no se puede reproducir en el reproductor integrado.';

            if (code === 101 || code === 150) {
              title = 'Incrustación Bloqueada por Copyright';
              message =
                'La discográfica ha bloqueado la reproducción de este videoclip oficial fuera de YouTube. Buscando automáticamente una versión alternativa de audio/karaoke compatible...';
              if (currentSong) {
                handleFindAlternative(currentSong);
              }
            } else if (code === 100) {
              title = 'Video no encontrado o privado';
              message = 'El video fue eliminado o marcado como privado por su autor.';
            } else if (code === 2) {
              title = 'Enlace o ID de video inválido';
              message = 'El parámetro del video de YouTube no es válido.';
            }

            setPlaybackError({
              code,
              title,
              message,
              countdown: 6
            });
          }
        }
      });
    }

    return () => {
      // Don't necessarily destroy on re-render to prevent flickering
    };
  }, []);

  // Synchronize playback with server state
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    const player = playerRef.current;

    if (!currentSong) {
      if (typeof player.stopVideo === 'function') {
        player.stopVideo();
      }
      return;
    }

    // Check if we need to load a new song
    const currentVideoUrl = player.getVideoUrl ? player.getVideoUrl() : '';
    const isDifferentSong = !currentVideoUrl.includes(currentSong.youtubeId);

    if (isDifferentSong) {
      player.loadVideoById(currentSong.youtubeId, 0);
    }

    // Calculate expected playback time based on server timestamp
    const now = Date.now();
    const elapsed = playback.isPlaying ? (now - playback.timestamp) / 1000 : 0;
    const targetTime = playback.currentTime + elapsed;

    // Correct drift if greater than 1.5s
    const playerTime = player.getCurrentTime ? player.getCurrentTime() : 0;
    if (Math.abs(playerTime - targetTime) > 1.5) {
      player.seekTo(targetTime, true);
    }

    // Sync play/pause state
    if (playback.isPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  }, [playback, isPlayerReady, currentSong?.youtubeId]);

  // Local ticker for smooth progress bar updates and duration limit checks
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlayerReady && playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || currentSong?.durationSeconds || 0;
        setLocalCurrentTime(time);
        setDuration(dur);

        // Failsafe: If loaded video exceeds the room's duration limit, notify and auto-skip
        if (
          dur > 0 &&
          roomSettings?.maxSongDurationSeconds &&
          roomSettings.maxSongDurationSeconds > 0 &&
          dur > roomSettings.maxSongDurationSeconds &&
          !playbackError
        ) {
          const maxMins = Math.floor(roomSettings.maxSongDurationSeconds / 60);
          const songMins = Math.floor(dur / 60);
          const songSecs = Math.floor(dur % 60);
          setPlaybackError({
            code: 999,
            title: 'Duración Excede el Límite de la Sala',
            message: `Esta canción dura ${songMins}m ${songSecs < 10 ? '0' : ''}${songSecs}s y supera el límite máximo de ${maxMins} minutos establecido para esta sala.`,
            countdown: 5
          });
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isPlayerReady, currentSong, roomSettings?.maxSongDurationSeconds, playbackError]);

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current || !isPlayerReady) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 50);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;

    onSeek(seekTime);
    if (playerRef.current) {
      playerRef.current.seekTo(seekTime, true);
    }
  };

  const progressPercent = duration > 0 ? (localCurrentTime / duration) * 100 : 0;

  // TV / Projector Mode: Center Theater Stage with the REAL YouTube Video playing in full size!
  if (isTvMode) {
    const nextSongs = queue ? queue.slice(0, 3) : [];
    const activeSoundMeta = lastSoundEvent
      ? SOUND_EFFECTS.find((s) => s.id === lastSoundEvent.soundId)
      : null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-slate-950 overflow-hidden select-none animate-fade-in">
        {/* Ambient Glows */}
        <div className="fixed -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[160px] pointer-events-none -z-10 bg-purple-600/20" />
        <div className="fixed -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] pointer-events-none -z-10 bg-pink-600/20" />

        {/* Floating Reactions on TV */}
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {reactions?.map((r) => (
            <div
              key={r.id}
              className="absolute text-5xl sm:text-6xl animate-float-fade"
              style={{
                left: `${20 + (parseInt(r.id.slice(-2), 16) % 60)}%`
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Floating Inactivity Warning on TV */}
        {inactivityWarning && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-amber-950/95 border-2 border-amber-500 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex-shrink-0">
                <Clock className="w-6 h-6 animate-spin" />
              </div>
              <div className="min-w-0 text-left">
                <h5 className="text-sm font-black text-white">
                  ⚠️ Sala Inactiva — Se cerrará en {formatTime(inactivityWarning.remainingSeconds)}
                </h5>
                <p className="text-xs text-amber-200">
                  Pongan música o pulsen el botón para continuar la fiesta.
                </p>
              </div>
            </div>
            {onKeepAlive && (
              <button
                onClick={onKeepAlive}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg transition-all cursor-pointer flex-shrink-0 active:scale-95"
              >
                Mantener Sala
              </button>
            )}
          </div>
        )}

        {/* Soundboard event popup */}
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

        {/* TV Header */}
        <header className="flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300">
                  {roomName || 'MiRocola'}
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

            {currentSong && (
              <button
                onClick={() => setShowVideo(!showVideo)}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-purple-800/40 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                title={showVideo ? 'Ver modo vinilo' : 'Ver video de YouTube'}
              >
                {showVideo ? (
                  <>
                    <VideoOff className="w-4 h-4 text-pink-400" />
                    <span className="hidden sm:inline">Ocultar Video</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Ver Video</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-800/40 text-purple-200 text-xs font-bold">
              <Users className="w-4 h-4 text-purple-400" />
              <span>{usersCount || 1} en la fiesta</span>
            </div>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-purple-950/60 border border-purple-800/40 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {onCloseTvMode && (
              <button
                onClick={onCloseTvMode}
                title="Salir del Modo TV (o presiona Esc)"
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-red-950/60 border border-slate-800 hover:border-red-800/60 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Center Theater Stage: Real YouTube Video! */}
        <div className="flex-1 my-auto flex items-center justify-center p-2 z-10 max-h-[62vh] w-full">
          <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-purple-800/40 bg-black flex items-center justify-center">
            {/* The Real YouTube Video Frame! */}
            <div
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                showVideo && currentSong ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div id="yt-player-frame" className="w-full h-full" />
            </div>

            {/* Vinyl view if video is toggled off */}
            {(!showVideo || !currentSong) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-purple-950/50 via-slate-950/90 to-slate-950">
                {currentSong ? (
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <div
                      className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center bg-black overflow-hidden mb-5 ${
                        playback.isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                      }`}
                    >
                      <img
                        src={currentSong.thumbnail}
                        alt=""
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-pink-500 shadow-lg"
                      />
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black text-white max-w-xl truncate drop-shadow-md">
                      {currentSong.title}
                    </h2>
                    <p className="text-sm sm:text-base text-pink-300 font-semibold mt-1">
                      {currentSong.channelTitle}
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-8 max-w-md">
                    <Disc3 className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-[spin_4s_linear_infinite]" />
                    <h3 className="text-xl font-bold text-white mb-2">
                      ¡La rocola está esperando música!
                    </h3>
                    <p className="text-xs text-slate-400">Escanea el código QR para pedir una canción.</p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 opacity-30 pointer-events-none">
                  <AudioVisualizer isPlaying={playback.isPlaying} barCount={56} colorScheme="neon" />
                </div>
              </div>
            )}

            {/* Karaoke overlay on TV Stage */}
            {showKaraoke && currentSong && (
              <div className="absolute inset-0 z-30">
                <KaraokeLyrics
                  title={currentSong.title}
                  channelTitle={currentSong.channelTitle}
                  durationSeconds={duration}
                  currentTime={localCurrentTime}
                  isPlaying={playback.isPlaying}
                  onSeek={canControl ? onSeek : undefined}
                  onClose={() => setShowKaraoke(false)}
                  isTvMode={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* TV Footer: Guest QR Card, Up Next, Progress & Controls */}
        <footer className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center z-20">
          {/* Guest QR Card (4 cols) */}
          <div className="md:col-span-4 flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border-2 border-pink-500/60 shadow-xl backdrop-blur-xl">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white p-1 border border-pink-500/40 shadow flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white/10 animate-pulse flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 inline-flex items-center gap-1 mb-1">
                <Smartphone className="w-3 h-3" /> Pide Canciones
              </span>
              <h4 className="text-sm sm:text-base font-black text-white truncate">
                Código: {roomCode}
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                Apunta tu cámara aquí para agregar música a la rocola.
              </p>
            </div>
          </div>

          {/* Center Playback & Timeline (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-2 p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-purple-800/40 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {currentSong ? currentSong.title : 'En silencio'}
                </h4>
                <p className="text-[11px] text-pink-300 truncate">
                  {currentSong ? currentSong.channelTitle : 'Esperando canciones'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canControl && (
                  <button
                    onClick={() =>
                      playback.isPlaying ? onPause(localCurrentTime) : onPlay(localCurrentTime)
                    }
                    className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
                  >
                    {playback.isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                )}
                {canControl && (
                  <button
                    onClick={onNext}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{formatTime(localCurrentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Up Next Ticker (3 cols) */}
          <div className="md:col-span-3 p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-purple-800/40 shadow-xl backdrop-blur-xl">
            <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-pink-400" /> Siguen en cola ({queue?.length || 0})
            </h5>
            {nextSongs.length > 0 ? (
              <div className="space-y-1.5">
                {nextSongs.map((song, i) => (
                  <div key={song.id} className="flex items-center gap-2 text-left">
                    <span className="text-[10px] font-bold text-slate-500 font-mono">#{i + 1}</span>
                    <img
                      src={song.thumbnail}
                      alt=""
                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                    />
                    <span className="text-[11px] font-medium text-slate-200 truncate flex-1">
                      {song.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No hay temas en espera. ¡Pide el tuyo!</p>
            )}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/90 border border-purple-900/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col">
      {/* Player Screen / Vinyl Visualizer Area */}
      <div className="relative w-full aspect-video sm:aspect-[21/9] bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden or Visible YouTube Player Frame */}
        <div
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
            showVideo && currentSong ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div id="yt-player-frame" className="w-full h-full" />
        </div>

        {/* Vinyl / Album Art Mode (shown when showVideo is false or no song) */}
        {(!showVideo || !currentSong) && (
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-slate-950/80 to-slate-950 flex items-center justify-center p-6 text-center">
            {currentSong ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 max-w-xl">
                {/* Rotating Vinyl */}
                <div
                  className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-slate-900 border-4 border-slate-800 shadow-2xl flex items-center justify-center ${
                    playback.isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                  }`}
                >
                  {/* Vinyl grooves */}
                  <div className="absolute inset-2 rounded-full border border-slate-700/50" />
                  <div className="absolute inset-4 rounded-full border border-slate-700/30" />
                  <div className="absolute inset-6 rounded-full border border-slate-700/20" />
                  {/* Album Cover Center */}
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-pink-500 shadow-md"
                  />
                  <div className="w-4 h-4 rounded-full bg-black border border-slate-600 absolute" />
                </div>

                {/* Song info in vinyl view */}
                <div className="text-left space-y-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-950/80 text-pink-300 font-semibold border border-pink-800/40">
                    Sonando Ahora
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-2">
                    {currentSong.title}
                  </h3>
                  <p className="text-sm text-purple-300">{currentSong.channelTitle}</p>
                  <p className="text-xs text-slate-400">
                    Agregada por:{' '}
                    <span className="text-slate-200 font-medium">
                      {currentSong.addedBy.name}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              /* Idle Empty State */
              <div className="space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400">
                  <Disc3 className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">La rocola está en silencio</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sé el primero en poner una canción pegando un enlace de YouTube.
                  </p>
                </div>
                <button
                  onClick={onOpenAddModal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 font-bold text-sm text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Music2 className="w-4 h-4" />
                  Agregar Canción a la Rocola
                </button>
              </div>
            )}

            {/* Ambient Audio Visualizer under vinyl */}
            {currentSong && (
              <div className="absolute inset-x-0 bottom-0 h-16 opacity-35 pointer-events-none">
                <AudioVisualizer isPlaying={playback.isPlaying} barCount={44} colorScheme="neon" />
              </div>
            )}
          </div>
        )}

        {/* Karaoke & Video Overlay Buttons (top right) */}
        {currentSong && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            {/* Karaoke Toggle Button */}
            <button
              onClick={() => setShowKaraoke(!showKaraoke)}
              className={`px-2.5 py-1.5 rounded-lg backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                showKaraoke
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-pink-500/25'
                  : 'bg-black/60 hover:bg-black/80 border-white/10 text-white'
              }`}
              title="Modo Letras / Karaoke Sincronizado"
            >
              <Mic2 className="w-3.5 h-3.5 text-pink-300" />
              <span>Karaoke</span>
            </button>

            {/* Video Mode Toggle */}
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title={showVideo ? 'Cambiar a modo visualizador' : 'Ver video de YouTube'}
            >
              {showVideo ? (
                <>
                  <VideoOff className="w-3.5 h-3.5 text-pink-400" />
                  <span className="hidden sm:inline">Ocultar Video</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Ver Video</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Karaoke Overlay Full Stage */}
        {showKaraoke && currentSong && (
          <div className="absolute inset-0 z-20">
            <KaraokeLyrics
              title={currentSong.title}
              channelTitle={currentSong.channelTitle}
              durationSeconds={duration}
              currentTime={localCurrentTime}
              isPlaying={playback.isPlaying}
              onSeek={(time) => {
                if (canControl) {
                  onSeek(time);
                  if (playerRef.current) {
                    playerRef.current.seekTo(time, true);
                  }
                }
              }}
              onClose={() => setShowKaraoke(false)}
            />
          </div>
        )}

        {/* Playback Error Overlay (e.g. Embedding restricted by LatinAutor / Universal / Exceeds duration) */}
        {playbackError && currentSong && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in border-2 border-red-500/50">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-600/60 flex items-center justify-center text-red-400 mb-3 shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
              {playbackError.title}
            </h3>

            <p className="text-xs text-red-200/90 max-w-md mb-2 leading-relaxed">
              {playbackError.message}
            </p>

            <p className="text-[11px] text-slate-400 mb-3 truncate max-w-sm">
              Canción: <span className="font-semibold text-slate-200">{currentSong.title}</span>
            </p>

            {fallbackStatus && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-950/90 border border-purple-500/50 text-xs text-purple-200 mb-4 max-w-md shadow-md animate-pulse">
                <RefreshCw
                  className={`w-4 h-4 text-pink-400 flex-shrink-0 ${
                    isSearchingFallback ? 'animate-spin' : ''
                  }`}
                />
                <span className="truncate">{fallbackStatus}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {(playbackError.code === 101 || playbackError.code === 150) && (
                <button
                  onClick={() => handleFindAlternative(currentSong)}
                  disabled={isSearchingFallback}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-xs text-white shadow-lg shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  title="Buscar y reproducir automáticamente una versión oficial de audio o karaoke"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearchingFallback ? 'animate-spin' : ''}`} />
                  <span>{isSearchingFallback ? 'Buscando audio...' : 'Reemplazar con Audio Oficial'}</span>
                </button>
              )}

              {canControl ? (
                <button
                  onClick={onNext}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 font-bold text-xs text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>
                    Saltar ahora {playbackError.countdown > 0 && `(${playbackError.countdown}s)`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={onVoteSkip}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 font-bold text-xs text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>Votar para saltar ({skipVotes.length}/{requiredSkipVotes})</span>
                </button>
              )}

              <a
                href={currentSong.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <span>Mirar en YouTube</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar (Clickable for host or collaborative) */}
      <div
        onClick={handleSeek}
        className={`w-full h-2.5 bg-slate-950 relative group ${
          canControl && currentSong ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
        {canControl && currentSong && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-pink-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        )}
      </div>

      {/* Player Controls Bar */}
      <div className="p-4 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Current Song Title & Time */}
        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
          {currentSong && (
            <img
              src={currentSong.thumbnail}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-purple-900/40 hidden sm:block"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">
              {currentSong ? currentSong.title : 'Esperando música...'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-purple-300 truncate">
                {currentSong ? currentSong.channelTitle : 'MiRocola'}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatTime(localCurrentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Playback Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          {canControl ? (
            <button
              onClick={() => {
                if (playback.isPlaying) {
                  onPause(localCurrentTime);
                } else {
                  onPlay(localCurrentTime);
                }
              }}
              disabled={!currentSong}
              className="w-11 h-11 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              {playback.isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-400">
              Controlado por el DJ
            </div>
          )}

          {/* Next Song Button (DJ or Collaborative) */}
          {canControl && (
            <button
              onClick={onNext}
              disabled={!currentSong}
              title="Siguiente canción"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 text-slate-200 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}

          {/* Vote to Skip Button (available to anyone!) */}
          {currentSong && (
            <button
              onClick={onVoteSkip}
              disabled={hasVotedSkip}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                hasVotedSkip
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-slate-900 hover:bg-purple-950/50 border-purple-900/40 hover:border-pink-500/50 text-slate-200'
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  hasVotedSkip ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-400'
                }`}
              />
              <span>
                {hasVotedSkip ? 'Voto registrado' : 'Votar Saltar'} ({skipVotes.length}/
                {requiredSkipVotes})
              </span>
            </button>
          )}
        </div>

        {/* Local Volume Slider */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={toggleMute}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-purple-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>
      </div>
    </div>
  );
};
