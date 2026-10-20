import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessage,
  ReactionEvent,
  SoundboardEvent
} from '@mirocola/shared';
import { RoomManager } from './roomManager.js';
import { YouTubeService } from './youtubeService.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer) {
  const roomManager = RoomManager.getInstance();

  // Background playback auto-advance & Auto-DJ broadcaster
  roomManager.setPlaybackSyncCallback((roomCode, room, autoDjSong) => {
    io.to(roomCode).emit('playback:sync', room.playback);
    io.to(roomCode).emit('queue:update', room.queue);
    io.to(roomCode).emit('history:update', room.history);
    io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

    if (autoDjSong) {
      const autoMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        user: { id: 'autodj', name: '🤖 Auto-DJ', avatar: '' },
        text: `🎧 ¡La música no para! Auto-DJ eligió: "${autoDjSong.title}"`,
        timestamp: Date.now(),
        isSystem: true
      };
      io.to(roomCode).emit('chat:message', autoMsg);
    }
  });

  // Room inactivity warning, clear, and auto-close callbacks
  roomManager.setInactivityCallbacks(
    (roomCode, remainingSeconds, message) => {
      io.to(roomCode).emit('inactivity:warning', { remainingSeconds, message });
    },
    (roomCode) => {
      io.to(roomCode).emit('inactivity:cleared');
    },
    (roomCode, message) => {
      io.to(roomCode).emit('room:closed', { reason: 'inactivity', message });
    }
  );

  io.on('connection', (socket: TypedSocket) => {
    // 1. Create Room
    socket.on('room:create', async (payload, callback) => {
      try {
        const { room, user } = await roomManager.createRoom(
          payload.roomName,
          payload.userName,
          payload.avatar || '',
          payload.mode || 'COLLABORATIVE',
          socket.id,
          payload.settings,
          payload.authUser
        );

        socket.join(room.code);
        callback({ success: true, code: room.code, state: room });

        // Welcome system message
        const welcomeMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          user: { id: 'system', name: 'MiRocola', avatar: '' },
          text: `🎉 Sala creada por ${user.name}. ¡Invita amigos con el código ${room.code}!`,
          timestamp: Date.now(),
          isSystem: true
        };
        io.to(room.code).emit('chat:message', welcomeMsg);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Error al crear la sala' });
      }
    });

    // 2. Join Room
    socket.on('room:join', (payload, callback) => {
      try {
        const { room, user } = roomManager.joinRoom(
          payload.code,
          payload.userName,
          payload.avatar || '',
          socket.id,
          payload.authUser
        );

        socket.join(room.code);
        callback({ success: true, state: room });

        // Notify other users
        io.to(room.code).emit('users:update', room.users);
        io.to(room.code).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

        const joinMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          user: { id: 'system', name: 'MiRocola', avatar: '' },
          text: `👋 ${user.name} se unió a la sala.`,
          timestamp: Date.now(),
          isSystem: true
        };
        io.to(room.code).emit('chat:message', joinMsg);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Error al unirse a la sala' });
      }
    });

    // 2.1 Reconnect Room (Session restore after connection flicker)
    socket.on('room:reconnect', (payload, callback) => {
      try {
        const { room, user } = roomManager.reconnectUser(
          payload.code,
          payload.userId,
          payload.userName,
          payload.avatar || '',
          socket.id
        );

        socket.join(room.code);
        callback({ success: true, state: room });
        io.to(room.code).emit('users:update', room.users);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'La sala ya no está disponible' });
      }
    });

    // 2.2 Keep Room Alive (Reset Inactivity timer)
    socket.on('room:keepAlive', (callback) => {
      try {
        const session = roomManager.getSession(socket.id);
        if (session) {
          roomManager.recordActivity(session.roomCode);
          io.to(session.roomCode).emit('inactivity:cleared');
        }
        if (typeof callback === 'function') callback();
      } catch {
        // Ignore silent fail
      }
    });

    // Helper to get active session
    const getSession = () => {
      const session = roomManager.getSession(socket.id);
      if (!session) throw new Error('No estás conectado a ninguna sala');
      return session;
    };

    // 3. Playback Controls
    socket.on('playback:play', (currentTime) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.play(roomCode, userId, currentTime);
        io.to(roomCode).emit('playback:sync', room.playback);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    socket.on('playback:pause', (currentTime) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.pause(roomCode, userId, currentTime);
        io.to(roomCode).emit('playback:sync', room.playback);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    socket.on('playback:seek', (time) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.seek(roomCode, userId, time);
        io.to(roomCode).emit('playback:sync', room.playback);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    socket.on('playback:next', async () => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.nextSong(roomCode, userId);
        io.to(roomCode).emit('playback:sync', room.playback);
        io.to(roomCode).emit('queue:update', room.queue);
        io.to(roomCode).emit('history:update', room.history);
        io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

        // Auto-DJ fallback when queue empties
        if (!room.playback.currentSong && room.settings.autoDjEnabled) {
          const autoRes = await roomManager.triggerAutoDj(roomCode);
          if (autoRes) {
            io.to(roomCode).emit('playback:sync', autoRes.room.playback);
            io.to(roomCode).emit('queue:update', autoRes.room.queue);
            const autoMsg: ChatMessage = {
              id: `msg_${Date.now()}`,
              user: { id: 'autodj', name: '🤖 Auto-DJ', avatar: '' },
              text: `🎧 ¡La música no para! Auto-DJ eligió: "${autoRes.song.title}"`,
              timestamp: Date.now(),
              isSystem: true
            };
            io.to(roomCode).emit('chat:message', autoMsg);
          }
        }
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    // 4. Queue Management
    socket.on('queue:add', async (urlOrQuery, callback) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.getRoom(roomCode);
        const user = room?.users.find((u) => u.id === userId);
        if (!user) throw new Error('Usuario no encontrado');

        const { room: updatedRoom, song } = await roomManager.addSong(roomCode, urlOrQuery, {
          id: user.id,
          name: user.name
        });

        io.to(roomCode).emit('playback:sync', updatedRoom.playback);
        io.to(roomCode).emit('queue:update', updatedRoom.queue);
        callback({ success: true, song });

        // Announce new song
        const songMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          user: { id: 'system', name: 'MiRocola', avatar: '' },
          text: `🎵 ${user.name} agregó "${song.title}" a la rocola.`,
          timestamp: Date.now(),
          isSystem: true
        };
        io.to(roomCode).emit('chat:message', songMsg);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Error al agregar canción' });
      }
    });

    socket.on('queue:remove', (songId) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.removeSong(roomCode, songId, userId);
        io.to(roomCode).emit('queue:update', room.queue);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    socket.on('queue:upvote', (songId) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.upvoteSong(roomCode, songId, userId);
        io.to(roomCode).emit('queue:update', room.queue);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    socket.on('queue:voteSkip', async () => {
      try {
        const { roomCode, userId } = getSession();
        const { room, skipped } = roomManager.voteSkip(roomCode, userId);

        if (skipped) {
          io.to(roomCode).emit('playback:sync', room.playback);
          io.to(roomCode).emit('queue:update', room.queue);
          io.to(roomCode).emit('history:update', room.history);
          io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

          const skipMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            user: { id: 'system', name: 'MiRocola', avatar: '' },
            text: `⏭️ ¡Votación completada! Se saltó a la siguiente canción.`,
            timestamp: Date.now(),
            isSystem: true
          };
          io.to(roomCode).emit('chat:message', skipMsg);

          // Auto-DJ fallback when queue empties after skip
          if (!room.playback.currentSong && room.settings.autoDjEnabled) {
            const autoRes = await roomManager.triggerAutoDj(roomCode);
            if (autoRes) {
              io.to(roomCode).emit('playback:sync', autoRes.room.playback);
              io.to(roomCode).emit('queue:update', autoRes.room.queue);
              const autoMsg: ChatMessage = {
                id: `msg_${Date.now()}`,
                user: { id: 'autodj', name: '🤖 Auto-DJ', avatar: '' },
                text: `🎧 Auto-DJ tomó el relevo con: "${autoRes.song.title}"`,
                timestamp: Date.now(),
                isSystem: true
              };
              io.to(roomCode).emit('chat:message', autoMsg);
            }
          }
        } else {
          io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);
        }
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    // 5. Chat & Reactions
    socket.on('chat:send', (text) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.getRoom(roomCode);
        const user = room?.users.find((u) => u.id === userId);
        if (!user || !text.trim()) return;

        const message: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
          },
          text: text.trim().substring(0, 300),
          timestamp: Date.now()
        };

        roomManager.recordActivity(roomCode);
        io.to(roomCode).emit('chat:message', message);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    socket.on('reaction:send', (emoji) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.getRoom(roomCode);
        const user = room?.users.find((u) => u.id === userId);
        if (!user) return;

        const reaction: ReactionEvent = {
          id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          emoji,
          user: {
            id: user.id,
            name: user.name
          },
          timestamp: Date.now()
        };

        roomManager.recordActivity(roomCode);
        io.to(roomCode).emit('reaction:new', reaction);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    // 6. DJ Soundboard
    socket.on('soundboard:play', (soundId) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.getRoom(roomCode);
        const user = room?.users.find((u) => u.id === userId);
        if (!user) return;

        const event: SoundboardEvent = {
          id: `sound_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          soundId,
          user: {
            id: user.id,
            name: user.name
          },
          timestamp: Date.now()
        };

        roomManager.recordActivity(roomCode);
        io.to(roomCode).emit('soundboard:played', event);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    // 7. YouTube Search
    socket.on('youtube:search', async (query, callback) => {
      try {
        const results = await YouTubeService.searchVideos(query, 6);
        callback({ success: true, results });
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Error en la búsqueda de YouTube' });
      }
    });

    // 6. Room Settings
    socket.on('room:updateSettings', (settings, callback) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.updateSettings(roomCode, userId, settings);

        io.to(roomCode).emit('room:sync', room);
        io.to(roomCode).emit('room:settingsUpdated', room.settings);
        io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

        callback({ success: true });

        const configMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          user: { id: 'system', name: 'MiRocola', avatar: '' },
          text: `⚙️ El anfitrión actualizó las reglas de la rocola.`,
          timestamp: Date.now(),
          isSystem: true
        };
        io.to(roomCode).emit('chat:message', configMsg);
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Error al actualizar configuraciones' });
      }
    });

    socket.on('room:setMode', (mode) => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.setMode(roomCode, userId, mode);
        io.to(roomCode).emit('room:sync', room);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    // 7. Disconnection
    socket.on('disconnect', () => {
      const { room, disconnectedUser, newHost } = roomManager.handleDisconnect(socket.id);
      if (room && disconnectedUser) {
        io.to(room.code).emit('users:update', room.users);
        io.to(room.code).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

        if (newHost) {
          io.to(room.code).emit('host:changed', newHost);
          const hostMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            user: { id: 'system', name: 'MiRocola', avatar: '' },
            text: `👑 El anfitrión anterior se desconectó. ${newHost.name} ahora es el nuevo anfitrión.`,
            timestamp: Date.now(),
            isSystem: true
          };
          io.to(room.code).emit('chat:message', hostMsg);
        }
      }
    });
  });
}
