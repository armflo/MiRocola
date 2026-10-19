import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type {
  RoomState,
  User,
  ChatMessage,
  ReactionEvent,
  RoomMode,
  Song
} from '@mirocola/shared';
import { socket } from './services/socket';
import { Navbar } from './components/Navbar';
import { RoomLobby } from './components/RoomLobby';
import { YouTubeSyncPlayer } from './components/YouTubeSyncPlayer';
import { SongQueue } from './components/SongQueue';
import { RoomChat } from './components/RoomChat';
import { AddSongModal } from './components/AddSongModal';
import { UserListModal } from './components/UserListModal';

export const App: React.FC = () => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'queue' | 'chat'>('queue');

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

    function onUsersUpdate(users: User[]) {
      setRoom((prev) => (prev ? { ...prev, users } : prev));
    }

    function onSkipUpdate(skipVotes: string[], required: number) {
      setRoom((prev) =>
        prev ? { ...prev, skipVotes, requiredSkipVotes: required } : prev
      );
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

    function onHostChanged(newHost: User) {
      setRoom((prev) => (prev ? { ...prev, hostId: newHost.id } : prev));
      setCurrentUser((prev) =>
        prev && prev.id === newHost.id ? { ...prev, isHost: true } : prev
      );
    }

    function onRoomError(err: string) {
      alert(err);
    }

    socket.on('room:sync', onRoomSync);
    socket.on('playback:sync', onPlaybackSync);
    socket.on('queue:update', onQueueUpdate);
    socket.on('users:update', onUsersUpdate);
    socket.on('skip:update', onSkipUpdate);
    socket.on('chat:message', onChatMessage);
    socket.on('reaction:new', onNewReaction);
    socket.on('host:changed', onHostChanged);
    socket.on('room:error', onRoomError);

    return () => {
      socket.off('room:sync', onRoomSync);
      socket.off('playback:sync', onPlaybackSync);
      socket.off('queue:update', onQueueUpdate);
      socket.off('users:update', onUsersUpdate);
      socket.off('skip:update', onSkipUpdate);
      socket.off('chat:message', onChatMessage);
      socket.off('reaction:new', onNewReaction);
      socket.off('host:changed', onHostChanged);
      socket.off('room:error', onRoomError);
    };
  }, []);

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
      { roomName, userName, avatar, mode },
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

    socket.emit('room:join', { code, userName, avatar }, (response) => {
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
  const handleAddSong = async (urlOrQuery: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socket.emit('queue:add', urlOrQuery, (response) => {
        if (response.success) {
          resolve(true);
        } else {
          resolve(false);
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
      <RoomLobby
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isLoading={isLoading}
        error={lobbyError}
      />
    );
  }

  const isHost = currentUser?.isHost ?? false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        room={room}
        currentUser={currentUser}
        onOpenUsers={() => setIsUsersModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main Room Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player & Stage (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <YouTubeSyncPlayer
            playback={room.playback}
            currentUser={currentUser}
            roomMode={room.mode}
            isHost={isHost}
            skipVotes={room.skipVotes}
            requiredSkipVotes={room.requiredSkipVotes}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onNext={handleNext}
            onVoteSkip={handleVoteSkip}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />

          {/* Mobile Tab Switcher (Queue vs Chat) */}
          <div className="flex lg:hidden grid-cols-2 p-1 bg-slate-900 rounded-xl border border-purple-900/40">
            <button
              onClick={() => setActiveTabMobile('queue')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTabMobile === 'queue'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              Cola ({room.queue.length})
            </button>
            <button
              onClick={() => setActiveTabMobile('chat')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTabMobile === 'chat'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              Chat de la Sala
            </button>
          </div>

          {/* On Mobile, show either queue or chat based on tab */}
          <div className="block lg:hidden">
            {activeTabMobile === 'queue' ? (
              <SongQueue
                queue={room.queue}
                currentUser={currentUser}
                roomMode={room.mode}
                isHost={isHost}
                onUpvote={handleUpvoteSong}
                onRemove={handleRemoveSong}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            ) : (
              <RoomChat
                messages={messages}
                reactions={reactions}
                currentUser={currentUser}
                onSendMessage={handleSendMessage}
                onSendReaction={handleSendReaction}
              />
            )}
          </div>
        </div>

        {/* Right Column: Queue & Chat (Desktop only, 5 cols on lg) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-6">
          {/* Queue in top half */}
          <div className="flex-1">
            <SongQueue
              queue={room.queue}
              currentUser={currentUser}
              roomMode={room.mode}
              isHost={isHost}
              onUpvote={handleUpvoteSong}
              onRemove={handleRemoveSong}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          </div>

          {/* Chat in bottom half */}
          <div className="h-[340px]">
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

      {/* Add Song Modal */}
      <AddSongModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSong={handleAddSong}
      />

      {/* User List Modal */}
      <UserListModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={room.users}
        currentUserId={currentUser?.id}
      />
    </div>
  );
};

export default App;
