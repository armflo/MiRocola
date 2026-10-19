import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessage,
  ReactionEvent
} from '@mirocola/shared';
import { RoomManager } from './roomManager.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer) {
  const roomManager = RoomManager.getInstance();

  io.on('connection', (socket: TypedSocket) => {
    // 1. Create Room
    socket.on('room:create', async (payload, callback) => {
      try {
        const { room, user } = await roomManager.createRoom(
          payload.roomName,
          payload.userName,
          payload.avatar || '',
          payload.mode || 'COLLABORATIVE',
          socket.id
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
          socket.id
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

    socket.on('playback:next', () => {
      try {
        const { roomCode, userId } = getSession();
        const room = roomManager.nextSong(roomCode, userId);
        io.to(roomCode).emit('playback:sync', room.playback);
        io.to(roomCode).emit('queue:update', room.queue);
        io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);
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

    socket.on('queue:voteSkip', () => {
      try {
        const { roomCode, userId } = getSession();
        const { room, skipped } = roomManager.voteSkip(roomCode, userId);

        if (skipped) {
          io.to(roomCode).emit('playback:sync', room.playback);
          io.to(roomCode).emit('queue:update', room.queue);
          io.to(roomCode).emit('skip:update', room.skipVotes, room.requiredSkipVotes);

          const skipMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            user: { id: 'system', name: 'MiRocola', avatar: '' },
            text: `⏭️ ¡Votación completada! Se saltó a la siguiente canción.`,
            timestamp: Date.now(),
            isSystem: true
          };
          io.to(roomCode).emit('chat:message', skipMsg);
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

        io.to(roomCode).emit('reaction:new', reaction);
      } catch (err: any) {
        socket.emit('room:error', err.message);
      }
    });

    // 6. Room Settings
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
