import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  SkipForward,
  Music,
  ListMusic,
  MessageSquare,
  Plus,
  Clock
} from 'lucide-react';
import type {
  RoomState,
  User,
  ChatMessage,
  ReactionEvent,
  RoomMode,
  Song,
  RoomSettings,
  SoundEffectId,
  SoundboardEvent,
  YouTubeSearchResult,
  AuthUser,
  ActiveRoomGame
} from '@mirocola/shared';
import { formatTime } from './lib/utils';
import { socket, wakeUpBackend } from './services/socket';
import { authService } from './services/auth';
import { THEMES } from './lib/theme';
import { playSoundEffect, SOUND_EFFECTS } from './lib/soundboard';
import { Navbar } from './components/Navbar';
import { RoomLobby } from './components/RoomLobby';
import { YouTubeSyncPlayer } from './components/YouTubeSyncPlayer';
import { SongQueue } from './components/SongQueue';
import { RoomChat } from './components/RoomChat';
import { AddSongModal } from './components/AddSongModal';
import { UserListModal } from './components/UserListModal';
import { RoomSettingsModal } from './components/RoomSettingsModal';
import { QRCodeModal } from './components/QRCodeModal';
import { Soundboard } from './components/Soundboard';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SavePlaylistModal } from './components/SavePlaylistModal';
import { PlaylistViewModal } from './components/PlaylistViewModal';
import { VoiceChatBar } from './components/VoiceChatBar';
import { MiniGamesHub } from './components/MiniGamesHub';

export const App: React.FC = () => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // User Auth & Profile state
  const [authUser, setAuthUser] = useState<AuthUser | null>(authService.getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Playlists state
  const [isSavePlaylistOpen, setIsSavePlaylistOpen] = useState(false);
  const [songsToSave, setSongsToSave] = useState<Song[]>([]);
  const [activePlaylistSlug, setActivePlaylistSlug] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isTvModeOpen, setIsTvModeOpen] = useState(false);
  const [isMiniGamesOpen, setIsMiniGamesOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<ActiveRoomGame | null>(null);

  // Soundboard state
  const [isSoundboardMuted, setIsSoundboardMuted] = useState(false);
  const [lastSoundEvent, setLastSoundEvent] = useState<SoundboardEvent | null>(null);

  // Inactivity warning state
  const [inactivityWarning, setInactivityWarning] = useState<{
    remainingSeconds: number;
    message: string;
  } | null>(null);

  // Mobile navigation tab: 'player' | 'queue' | 'chat'
  const [mobileTab, setMobileTab] = useState<'player' | 'queue' | 'chat'>('player');

  // Verify and refresh session on mount, wake up backend & check for playlist param
  useEffect(() => {
    // Pre-warm backend and socket connection in background immediately
    wakeUpBackend();

    if (authService.hasSession()) {
      authService.getMe().then((user) => {
        if (user) {
          setAuthUser(user);
        }
      });
    }

    const params = new URLSearchParams(window.location.search);
    const plParam = params.get('playlist') || params.get('p');
    if (plParam) {
      setActivePlaylistSlug(plParam);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    function onRoomSync(state: RoomState) {
      setRoom(state);
    }

    function onPlaybackSync(playback: RoomState['playback']) {
      setRoom((prev) => (prev ? { ...prev, playback } : prev));
    }

    function onQueueUpdate(queue: Song[]) {
      setRoom((prev) => (prev ? { ...prev, queue } : prev));
    }

    function onHistoryUpdate(history: Song[]) {
      setRoom((prev) => (prev ? { ...prev, history } : prev));
    }

    function onUsersUpdate(users: User[]) {
      setRoom((prev) => (prev ? { ...prev, users } : prev));
      // Reactively sync DJ Score if current user is logged in
      setAuthUser((prev) => {
        if (!prev) return prev;
        const me = users.find((u) => u.persistentId === prev.id);
        if (me && typeof me.djScore === 'number' && me.djScore !== prev.djScore) {
          const updated = { ...prev, djScore: me.djScore };
          authService.saveSession(authService.getToken() || '', updated);
          return updated;
        }
        return prev;
      });
    }

    function onSkipUpdate(skipVotes: string[], required: number) {
      setRoom((prev) =>
        prev ? { ...prev, skipVotes, requiredSkipVotes: required } : prev
      );
    }

    function onSettingsUpdated(settings: RoomSettings) {
      setRoom((prev) => (prev ? { ...prev, settings } : prev));
    }

    function onChatMessage(message: ChatMessage) {
      setMessages((prev) => [...prev, message]);
    }

    function onNewReaction(reaction: ReactionEvent) {
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2500);

      // Party confetti on fire or drink reactions
      if (reaction.emoji === '🔥' || reaction.emoji === '🍻' || reaction.emoji === '🎉') {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    }

    function onSoundboardPlayed(event: SoundboardEvent) {
      if (!isSoundboardMuted) {
        playSoundEffect(event.soundId);
      }
      setLastSoundEvent(event);
      setTimeout(() => {
        setLastSoundEvent((cur) => (cur?.id === event.id ? null : cur));
      }, 2400);
    }

    function onHostChanged(newHost: User) {
      setRoom((prev) => (prev ? { ...prev, hostId: newHost.id } : prev));
      setCurrentUser((prev) =>
        prev && prev.id === newHost.id ? { ...prev, isHost: true } : prev
      );
    }

    function onRoomError(err: string) {
      const lower = err.toLowerCase();
      if (
        lower.includes('no existe') ||
        lower.includes('no encontrada') ||
        lower.includes('cerrada') ||
        lower.includes('no estás conectado')
      ) {
        setRoom(null);
        setCurrentUser(null);
        setInactivityWarning(null);
        setLobbyError(err);
      } else {
        alert(err);
      }
    }

    function onInactivityWarning(data: { remainingSeconds: number; message: string }) {
      setInactivityWarning(data);
    }

    function onInactivityCleared() {
      setInactivityWarning(null);
    }

    function onRoomClosed(data: { reason: string; message: string }) {
      setInactivityWarning(null);
      setRoom(null);
      setCurrentUser(null);
      setLobbyError(data.message || 'La sala fue cerrada automáticamente por inactividad.');
    }

    function onGameUpdate(game: ActiveRoomGame | null) {
      setActiveGame(game);
      if (game) {
        setIsMiniGamesOpen(true);
      }
    }

    function onGameNotification(data: { title: string; message: string; emoji: string }) {
      if (data.emoji === '🏆' || data.emoji === '🎡') {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    }

    socket.on('room:sync', onRoomSync);
    socket.on('playback:sync', onPlaybackSync);
    socket.on('queue:update', onQueueUpdate);
    socket.on('history:update', onHistoryUpdate);
    socket.on('users:update', onUsersUpdate);
    socket.on('skip:update', onSkipUpdate);
    socket.on('room:settingsUpdated', onSettingsUpdated);
    socket.on('chat:message', onChatMessage);
    socket.on('reaction:new', onNewReaction);
    socket.on('soundboard:played', onSoundboardPlayed);
    socket.on('host:changed', onHostChanged);
    socket.on('room:error', onRoomError);
    socket.on('inactivity:warning', onInactivityWarning);
    socket.on('inactivity:cleared', onInactivityCleared);
    socket.on('room:closed', onRoomClosed);
    socket.on('game:update', onGameUpdate);
    socket.on('game:notification', onGameNotification);

    return () => {
      socket.off('room:sync', onRoomSync);
      socket.off('playback:sync', onPlaybackSync);
      socket.off('queue:update', onQueueUpdate);
      socket.off('history:update', onHistoryUpdate);
      socket.off('users:update', onUsersUpdate);
      socket.off('skip:update', onSkipUpdate);
      socket.off('room:settingsUpdated', onSettingsUpdated);
      socket.off('chat:message', onChatMessage);
      socket.off('reaction:new', onNewReaction);
      socket.off('soundboard:played', onSoundboardPlayed);
      socket.off('host:changed', onHostChanged);
      socket.off('room:error', onRoomError);
      socket.off('inactivity:warning', onInactivityWarning);
      socket.off('inactivity:cleared', onInactivityCleared);
      socket.off('room:closed', onRoomClosed);
      socket.off('game:update', onGameUpdate);
      socket.off('game:notification', onGameNotification);
    };
  }, [isSoundboardMuted]);

  // Local 1-second countdown when room inactivity warning is active
  useEffect(() => {
    if (!inactivityWarning) return;

    const timer = setInterval(() => {
      setInactivityWarning((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          setRoom(null);
          setCurrentUser(null);
          setLobbyError('La sala fue cerrada automáticamente por inactividad prolongada.');
          return null;
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [inactivityWarning]);

  // Seamless session recovery if socket reconnected after WiFi flickers or mobile sleep
  useEffect(() => {
    function handleSocketConnect() {
      if (room && currentUser) {
        socket.emit(
          'room:reconnect',
          {
            code: room.code,
            userId: currentUser.id,
            userName: currentUser.name,
            avatar: currentUser.avatar
          },
          (res) => {
            if (res.success && res.state) {
              setRoom(res.state);
            } else if (!res.success) {
              setRoom(null);
              setCurrentUser(null);
              setInactivityWarning(null);
              setLobbyError(res.error || 'La sala ya no existe o fue cerrada por inactividad.');
            }
          }
        );
      }
    }

    socket.on('connect', handleSocketConnect);
    return () => {
      socket.off('connect', handleSocketConnect);
    };
  }, [room?.code, currentUser?.id]);

  // Auth handlers
  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setAuthUser(null);
    setIsProfileModalOpen(false);
  };

  const handlePlaylistCreated = () => {
    // Award +25 DJ points locally so profile updates instantly
    setAuthUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, djScore: prev.djScore + 25 };
      authService.saveSession(authService.getToken() || '', updated);
      return updated;
    });
  };

  const handleLoadSongsToQueue = async (urls: string[]) => {
    for (const url of urls) {
      await handleAddSong(url);
    }
  };

  // 1. Create Room handler
  const handleCreateRoom = (
    roomName: string,
    userName: string,
    avatar: string,
    mode: RoomMode
  ) => {
    setIsLoading(true);
    setLobbyError(null);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      'room:create',
      { roomName, userName, avatar, mode, authUser: authUser || undefined },
      (response) => {
        setIsLoading(false);
        if (response.success && response.state) {
          setRoom(response.state);
          const me = response.state.users.find((u) => u.name === userName);
          setCurrentUser(me || null);

          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else {
          setLobbyError(response.error || 'Error al crear la sala');
        }
      }
    );
  };

  // 2. Join Room handler
  const handleJoinRoom = (code: string, userName: string, avatar: string) => {
    setIsLoading(true);
    setLobbyError(null);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('room:join', { code, userName, avatar, authUser: authUser || undefined }, (response) => {
      setIsLoading(false);
      if (response.success && response.state) {
        setRoom(response.state);
        const me = response.state.users.find((u) => u.name === userName);
        setCurrentUser(me || null);
      } else {
        setLobbyError(response.error || 'No se pudo conectar a la sala');
      }
    });
  };

  // 3. Leave Room
  const handleLeaveRoom = () => {
    socket.disconnect();
    setRoom(null);
    setCurrentUser(null);
    setMessages([]);
    setReactions([]);
  };

  // Playback control emitters
  const handlePlay = (currentTime?: number) => {
    socket.emit('playback:play', currentTime);
  };

  const handlePause = (currentTime?: number) => {
    socket.emit('playback:pause', currentTime);
  };

  const handleSeek = (time: number) => {
    socket.emit('playback:seek', time);
  };

  const handleNext = () => {
    socket.emit('playback:next');
  };

  // Queue actions
  const handleAddSong = async (
    urlOrQuery: string
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      socket.emit('queue:add', urlOrQuery, (response) => {
        if (response.success) {
          setInactivityWarning(null);
          resolve({ success: true });
        } else {
          const err = response.error || 'Error al agregar canción';
          const lower = err.toLowerCase();
          if (
            lower.includes('no existe') ||
            lower.includes('no encontrada') ||
            lower.includes('cerrada') ||
            lower.includes('no estás conectado')
          ) {
            setRoom(null);
            setCurrentUser(null);
            setInactivityWarning(null);
            setLobbyError(err);
          }
          resolve({ success: false, error: err });
        }
      });
    });
  };

  const handleSearchYouTube = async (query: string): Promise<YouTubeSearchResult[]> => {
    return new Promise((resolve) => {
      socket.emit('youtube:search', query, (res) => {
        if (res.success && res.results) {
          resolve(res.results);
        } else {
          resolve([]);
        }
      });
    });
  };

  const handleRemoveSong = (songId: string) => {
    socket.emit('queue:remove', songId);
  };

  const handleUpvoteSong = (songId: string) => {
    socket.emit('queue:upvote', songId);
  };

  const handleVoteSkip = () => {
    socket.emit('queue:voteSkip');
  };

  // Soundboard
  const handleTriggerSound = (soundId: SoundEffectId) => {
    socket.emit('soundboard:play', soundId);
  };

  // Settings updates
  const handleUpdateSettings = async (
    settings: Partial<RoomSettings>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      socket.emit('room:updateSettings', settings, (response) => {
        if (response.success) {
          resolve(true);
        } else {
          alert(response.error || 'No se pudo actualizar la configuración');
          resolve(false);
        }
      });
    });
  };

  const handleUpdateMode = (mode: RoomMode) => {
    socket.emit('room:setMode', mode);
  };

  // Chat & reactions
  const handleSendMessage = (text: string) => {
    socket.emit('chat:send', text);
  };

  const handleSendReaction = (emoji: string) => {
    socket.emit('reaction:send', emoji);
  };

  // If not joined to any room, show Lobby
  if (!room) {
    return (
      <>
        <RoomLobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isLoading={isLoading}
          error={lobbyError}
          authUser={authUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />

        {authUser && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            authUser={authUser}
            onUpdateUser={(updated) => setAuthUser(updated)}
            onLogout={handleLogout}
            onOpenPlaylist={(slug) => {
              setIsProfileModalOpen(false);
              setActivePlaylistSlug(slug);
            }}
          />
        )}

        <PlaylistViewModal
          isOpen={!!activePlaylistSlug}
          onClose={() => setActivePlaylistSlug(null)}
          playlistIdOrSlug={activePlaylistSlug}
          authUser={authUser}
          onRequireAuth={() => setIsAuthModalOpen(true)}
          onLoadSongsToQueue={undefined}
        />
      </>
    );
  }

  const isHost = currentUser?.isHost ?? false;
  const canControl = room.mode === 'COLLABORATIVE' || isHost;
  const currentSong = room.playback.currentSong;
  const currentTheme = THEMES[room.settings?.theme || 'neon'] || THEMES.neon;

  // Current active sound effect metadata for alert
  const activeSoundMeta = lastSoundEvent
    ? SOUND_EFFECTS.find((s) => s.id === lastSoundEvent.soundId)
    : null;

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col transition-colors duration-700 pb-20 lg:pb-0 relative overflow-hidden"
      style={{ backgroundColor: currentTheme.bgDark }}
    >
      {/* Dynamic Ambient Theme Lighting Orbs */}
      <div
        className="fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 z-0"
        style={{ backgroundColor: currentTheme.glow1 }}
      />
      <div
        className="fixed -bottom-40 -right-40 w-[650px] h-[650px] rounded-full blur-[150px] pointer-events-none transition-all duration-700 z-0"
        style={{ backgroundColor: currentTheme.glow2 }}
      />

      {/* Top Navigation */}
      <Navbar
        room={room}
        currentUser={currentUser}
        authUser={authUser}
        theme={currentTheme}
        activeGame={activeGame}
        onOpenUsers={() => setIsUsersModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenTvMode={() => setIsTvModeOpen(true)}
        onOpenMiniGames={() => setIsMiniGamesOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Floating Soundboard Event Alert */}
      {lastSoundEvent && activeSoundMeta && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/95 border border-pink-500/60 shadow-2xl backdrop-blur-md">
            <span className="text-2xl">{activeSoundMeta.emoji}</span>
            <div className="text-left leading-tight">
              <span className="text-[11px] font-bold text-pink-400">
                {lastSoundEvent.user.name}
              </span>
              <p className="text-xs text-white font-semibold">
                ¡Tocó {activeSoundMeta.name}!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Inactivity Warning Countdown Alert */}
      {inactivityWarning && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-amber-950/95 border-2 border-amber-500/80 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <h5 className="text-xs sm:text-sm font-bold text-white">
                  ⚠️ Sala Inactiva — Cerrando en {formatTime(inactivityWarning.remainingSeconds)}
                </h5>
              </div>
              <p className="text-[11px] text-amber-200 truncate">
                Pon música o pulsa el botón para mantenerla abierta.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              socket.emit('room:keepAlive');
              setInactivityWarning(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow transition-all cursor-pointer flex-shrink-0 active:scale-95"
          >
            Mantener Sala
          </button>
        </div>
      )}

      {/* Voice Chat / Karaoke Party Bar */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4">
        <VoiceChatBar roomCode={room.code} currentUser={currentUser} />
      </div>

      {/* Main Room Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left / Primary Column: Player, Soundboard & Stage (7 cols on desktop) */}
        <div
          className={`lg:col-span-7 flex flex-col gap-5 sm:gap-6 ${
            mobileTab === 'player' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Synchronized Player with Native TV Theater Mode */}
          <YouTubeSyncPlayer
            playback={room.playback}
            currentUser={currentUser}
            roomMode={room.mode}
            roomSettings={room.settings}
            isHost={isHost}
            skipVotes={room.skipVotes}
            requiredSkipVotes={room.requiredSkipVotes}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onNext={handleNext}
            onVoteSkip={handleVoteSkip}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            isTvMode={isTvModeOpen}
            onCloseTvMode={() => setIsTvModeOpen(false)}
            roomCode={room.code}
            roomName={room.name}
            usersCount={room.users.length}
            queue={room.queue}
            reactions={reactions}
            lastSoundEvent={lastSoundEvent}
            inactivityWarning={inactivityWarning}
            onKeepAlive={() => {
              socket.emit('room:keepAlive');
              setInactivityWarning(null);
            }}
          />

          {/* Soundboard DJ Effects */}
          <Soundboard
            onTriggerSound={handleTriggerSound}
            isMuted={isSoundboardMuted}
            onToggleMute={() => setIsSoundboardMuted(!isSoundboardMuted)}
          />
        </div>

        {/* Right Column: Queue & Chat (Desktop only, or Mobile Tab switcher) */}
        <div
          className={`lg:col-span-5 flex-col gap-5 sm:gap-6 ${
            mobileTab !== 'player' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Queue Tab / Section */}
          <div
            className={`flex-1 ${
              mobileTab === 'queue' ? 'block' : 'hidden lg:block'
            }`}
          >
            <SongQueue
              queue={room.queue}
              history={room.history || []}
              currentUser={currentUser}
              roomMode={room.mode}
              roomSettings={room.settings}
              isHost={isHost}
              onUpvote={handleUpvoteSong}
              onRemove={handleRemoveSong}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onAddSong={handleAddSong}
              onOpenSavePlaylist={(songs) => {
                setSongsToSave(songs);
                setIsSavePlaylistOpen(true);
              }}
            />
          </div>

          {/* Chat Tab / Section */}
          <div
            className={`h-[420px] lg:h-[340px] ${
              mobileTab === 'chat' ? 'block' : 'hidden lg:block'
            }`}
          >
            <RoomChat
              messages={messages}
              reactions={reactions}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
            />
          </div>
        </div>
      </main>

      {/* Mobile Persistent Mini-Player Bar (Shown when mobile user is on Queue or Chat tab) */}
      {mobileTab !== 'player' && currentSong && (
        <div className="lg:hidden fixed bottom-16 inset-x-3 z-30 bg-slate-900/95 border border-purple-800/60 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-fade-in">
          <button
            onClick={() => setMobileTab('player')}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
          >
            <img
              src={currentSong.thumbnail}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-purple-900/40"
            />
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-white truncate">
                {currentSong.title}
              </h5>
              <p className="text-[10px] text-purple-300 truncate">
                {currentSong.channelTitle}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {canControl && (
              <button
                onClick={() => {
                  if (room.playback.isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }}
                className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center shadow cursor-pointer"
              >
                {room.playback.isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            )}

            {canControl && (
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                title="Siguiente"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (iOS / Android Style) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 border-t border-purple-900/40 backdrop-blur-lg px-2 py-1.5 flex justify-around items-center safe-area-bottom">
        <button
          onClick={() => setMobileTab('player')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            mobileTab === 'player'
              ? 'text-pink-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Music className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Rocola</span>
        </button>

        <button
          onClick={() => setMobileTab('queue')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === 'queue'
              ? 'text-pink-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListMusic className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Cola ({room.queue.length})</span>
          {room.queue.length > 0 && (
            <span className="absolute top-0.5 right-3 w-2 h-2 rounded-full bg-pink-500" />
          )}
        </button>

        <button
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === 'chat'
              ? 'text-pink-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Chat</span>
          {messages.length > 0 && (
            <span className="absolute top-0.5 right-3 w-2 h-2 rounded-full bg-purple-500" />
          )}
        </button>

        {/* Floating Add Song Trigger Button on Mobile */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-transform"
          title="Pedir Canción"
        >
          <Plus className="w-5 h-5" />
        </button>
      </nav>

      {/* Add Song Modal with Integrated YouTube Search */}
      <AddSongModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        roomSettings={room.settings}
        onAddSong={handleAddSong}
        onSearchYouTube={handleSearchYouTube}
      />

      {/* User List Modal */}
      <UserListModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={room.users}
        currentUserId={currentUser?.id}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomCode={room.code}
        roomName={room.name}
      />

      {/* Room Settings Modal (Host only) */}
      {isHost && (
        <RoomSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentSettings={room.settings}
          currentMode={room.mode}
          onUpdateSettings={handleUpdateSettings}
          onUpdateMode={handleUpdateMode}
        />
      )}

      {/* Auth Modal (Register / Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* User Profile & DJ Score Modal */}
      {authUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          authUser={authUser}
          onUpdateUser={(updated) => setAuthUser(updated)}
          onLogout={handleLogout}
          onOpenPlaylist={(slug) => {
            setIsProfileModalOpen(false);
            setActivePlaylistSlug(slug);
          }}
        />
      )}

      {/* Save Playlist Modal */}
      <SavePlaylistModal
        isOpen={isSavePlaylistOpen}
        onClose={() => setIsSavePlaylistOpen(false)}
        songs={songsToSave}
        authUser={authUser}
        onRequireAuth={() => setIsAuthModalOpen(true)}
        onPlaylistCreated={handlePlaylistCreated}
      />

      {/* Playlist View / Social Modal */}
      <PlaylistViewModal
        isOpen={!!activePlaylistSlug}
        onClose={() => setActivePlaylistSlug(null)}
        playlistIdOrSlug={activePlaylistSlug}
        authUser={authUser}
        onRequireAuth={() => setIsAuthModalOpen(true)}
        onLoadSongsToQueue={handleLoadSongsToQueue}
      />

      {/* 🎮 Party Mini-games Hub */}
      <MiniGamesHub
        isOpen={isMiniGamesOpen}
        onClose={() => setIsMiniGamesOpen(false)}
        activeGame={activeGame}
        room={room}
        currentUser={currentUser}
      />
    </div>
  );
};

export default App;
