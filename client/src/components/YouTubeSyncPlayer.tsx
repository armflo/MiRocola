import React, { useEffect, useRef, useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import type { PlaybackState, User, RoomMode, RoomSettings } from '@mirocola/shared';
import { formatTime } from '../lib/utils';

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
  onOpenAddModal
}) => {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [playbackError, setPlaybackError] = useState<{
    code: number;
    title: string;
    message: string;
    countdown: number;
  } | null>(null);

  const canControl = roomMode === 'COLLABORATIVE' || isHost;
  const currentSong = playback.currentSong;
  const hasVotedSkip = currentUser ? skipVotes.includes(currentUser.id) : false;

  // Clear playback error when current song changes
  useEffect(() => {
    setPlaybackError(null);
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
                'El autor o la discográfica (ej. LatinAutor / UMPG / Sony) ha bloqueado la reproducción de este video fuera de YouTube.';
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
    }, 500);

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
          </div>
        )}

        {/* Video Mode Toggle overlay button (top right) */}
        {currentSong && (
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            title={showVideo ? 'Cambiar a modo visualizador' : 'Ver video de YouTube'}
          >
            {showVideo ? (
              <>
                <VideoOff className="w-3.5 h-3.5 text-pink-400" />
                <span>Ocultar Video</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Video</span>
              </>
            )}
          </button>
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

            <p className="text-[11px] text-slate-400 mb-5 truncate max-w-sm">
              Canción: <span className="font-semibold text-slate-200">{currentSong.title}</span>
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
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
