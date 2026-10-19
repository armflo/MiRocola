import { RoomState, Song, User, RoomMode, PlaybackState } from '@mirocola/shared';
import { prisma } from '../config/db.js';
import { YouTubeService } from './youtubeService.js';

interface SocketSession {
  socketId: string;
  userId: string;
  roomCode: string;
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomState> = new Map();
  private socketSessions: Map<string, SocketSession> = new Map();

  private constructor() {
    // Background interval to check song completion
    setInterval(() => this.checkPlaybackProgress(), 1000);
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Generate an uppercase 6-character room code (e.g. ROCO-98)
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new room, register in memory and persist in MySQL
   */
  public async createRoom(
    roomName: string,
    userName: string,
    avatar: string,
    mode: RoomMode = 'COLLABORATIVE',
    socketId: string
  ): Promise<{ room: RoomState; user: User }> {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const user: User = {
      id: userId,
      name: userName.trim() || 'Anfitrión',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      isHost: true,
      joinedAt: Date.now()
    };

    const roomState: RoomState = {
      code,
      name: roomName.trim() || `Rocola ${code}`,
      hostId: userId,
      mode,
      playback: {
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        timestamp: Date.now(),
        playbackRate: 1
      },
      queue: [],
      users: [user],
      skipVotes: [],
      requiredSkipVotes: 1
    };

    this.rooms.set(code, roomState);
    this.socketSessions.set(socketId, { socketId, userId, roomCode: code });

    // Persist to MySQL in background
    try {
      await prisma.room.create({
        data: {
          code,
          name: roomState.name,
          mode: roomState.mode,
          hostName: user.name
        }
      });
      console.log(`[DB] Room ${code} saved to MySQL.`);
    } catch (err) {
      console.error(`[DB Error] Could not save room ${code} to MySQL:`, err);
    }

    return { room: roomState, user };
  }

  /**
   * Join an existing room
   */
  public joinRoom(
    code: string,
    userName: string,
    avatar: string,
    socketId: string
  ): { room: RoomState; user: User } {
    const formattedCode = code.toUpperCase().trim();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      throw new Error(`La sala "${formattedCode}" no existe o fue cerrada.`);
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const user: User = {
      id: userId,
      name: userName.trim() || 'Invitado',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      isHost: false,
      joinedAt: Date.now()
    };

    room.users.push(user);
    this.updateSkipRequirement(room);

    this.socketSessions.set(socketId, { socketId, userId, roomCode: formattedCode });

    return { room, user };
  }

  /**
   * Handle user disconnection
   */
  public handleDisconnect(socketId: string): { room?: RoomState; disconnectedUser?: User; newHost?: User } {
    const session = this.socketSessions.get(socketId);
    if (!session) return {};

    this.socketSessions.delete(socketId);
    const room = this.rooms.get(session.roomCode);
    if (!room) return {};

    const userIndex = room.users.findIndex((u) => u.id === session.userId);
    if (userIndex === -1) return { room };

    const [disconnectedUser] = room.users.splice(userIndex, 1);
    room.skipVotes = room.skipVotes.filter((id) => id !== session.userId);
    this.updateSkipRequirement(room);

    let newHost: User | undefined;

    // If host left, transfer host to next oldest user
    if (room.hostId === session.userId && room.users.length > 0) {
      room.users[0].isHost = true;
      room.hostId = room.users[0].id;
      newHost = room.users[0];
    }

    // If room is empty, keep alive for 10 minutes then cleanup
    if (room.users.length === 0) {
      setTimeout(() => {
        const check = this.rooms.get(room.code);
        if (check && check.users.length === 0) {
          this.rooms.delete(room.code);
          console.log(`[Room Clean] Room ${room.code} cleaned from memory.`);
        }
      }, 10 * 60 * 1000);
    }

    return { room, disconnectedUser, newHost };
  }

  public getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  public getSession(socketId: string): SocketSession | undefined {
    return this.socketSessions.get(socketId);
  }

  /**
   * Add a song to the room queue
   */
  public async addSong(
    code: string,
    urlOrQuery: string,
    user: { id: string; name: string }
  ): Promise<{ room: RoomState; song: Song }> {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');

    const meta = await YouTubeService.getVideoMeta(urlOrQuery);

    const song: Song = {
      id: `song_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      youtubeId: meta.youtubeId,
      url: meta.url,
      title: meta.title,
      channelTitle: meta.channelTitle,
      durationSeconds: meta.durationSeconds,
      thumbnail: meta.thumbnail,
      addedBy: user,
      addedAt: Date.now(),
      upvotes: []
    };

    // If no song is currently playing, start playing immediately!
    if (!room.playback.currentSong) {
      room.playback.currentSong = song;
      room.playback.isPlaying = true;
      room.playback.currentTime = 0;
      room.playback.timestamp = Date.now();
      room.skipVotes = [];
      this.recordSongHistory(room.code, song);
    } else {
      room.queue.push(song);
    }

    return { room, song };
  }

  /**
   * Remove a song from the queue
   */
  public removeSong(code: string, songId: string, userId: string): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');

    const songIndex = room.queue.findIndex((s) => s.id === songId);
    if (songIndex === -1) return room;

    const song = room.queue[songIndex];
    const isHost = room.hostId === userId;
    const isOwner = song.addedBy.id === userId;

    if (!isHost && !isOwner && room.mode === 'DJ_ONLY') {
      throw new Error('No tienes permiso para eliminar esta canción');
    }

    room.queue.splice(songIndex, 1);
    return room;
  }

  /**
   * Upvote a song to move it higher in the queue
   */
  public upvoteSong(code: string, songId: string, userId: string): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');

    const song = room.queue.find((s) => s.id === songId);
    if (!song) return room;

    const voteIdx = song.upvotes.indexOf(userId);
    if (voteIdx >= 0) {
      song.upvotes.splice(voteIdx, 1); // Toggle off
    } else {
      song.upvotes.push(userId); // Add vote
    }

    // Sort queue: highest upvotes first, then oldest addedAt
    room.queue.sort((a, b) => {
      if (b.upvotes.length !== a.upvotes.length) {
        return b.upvotes.length - a.upvotes.length;
      }
      return a.addedAt - b.addedAt;
    });

    return room;
  }

  /**
   * Vote to skip current song
   */
  public voteSkip(code: string, userId: string): { room: RoomState; skipped: boolean } {
    const room = this.getRoom(code);
    if (!room || !room.playback.currentSong) return { room: room!, skipped: false };

    if (!room.skipVotes.includes(userId)) {
      room.skipVotes.push(userId);
    }

    this.updateSkipRequirement(room);

    if (room.skipVotes.length >= room.requiredSkipVotes) {
      this.nextSong(code);
      return { room, skipped: true };
    }

    return { room, skipped: false };
  }

  /**
   * Play playback
   */
  public play(code: string, userId: string, currentTime?: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');
    this.assertPlaybackControl(room, userId);

    room.playback.isPlaying = true;
    if (typeof currentTime === 'number') {
      room.playback.currentTime = currentTime;
    }
    room.playback.timestamp = Date.now();

    return room;
  }

  /**
   * Pause playback
   */
  public pause(code: string, userId: string, currentTime?: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');
    this.assertPlaybackControl(room, userId);

    room.playback.isPlaying = false;
    if (typeof currentTime === 'number') {
      room.playback.currentTime = currentTime;
    } else {
      // Calculate elapsed time before pausing
      const elapsed = (Date.now() - room.playback.timestamp) / 1000;
      room.playback.currentTime += elapsed;
    }
    room.playback.timestamp = Date.now();

    return room;
  }

  /**
   * Seek playback to a specific timestamp in seconds
   */
  public seek(code: string, userId: string, time: number): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');
    this.assertPlaybackControl(room, userId);

    room.playback.currentTime = Math.max(0, time);
    room.playback.timestamp = Date.now();

    return room;
  }

  /**
   * Advance to the next song in the queue
   */
  public nextSong(code: string, userId?: string): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');

    if (userId) {
      this.assertPlaybackControl(room, userId);
    }

    room.skipVotes = [];

    if (room.queue.length > 0) {
      const next = room.queue.shift()!;
      room.playback.currentSong = next;
      room.playback.currentTime = 0;
      room.playback.isPlaying = true;
      room.playback.timestamp = Date.now();
      this.recordSongHistory(room.code, next);
    } else {
      room.playback.currentSong = null;
      room.playback.currentTime = 0;
      room.playback.isPlaying = false;
      room.playback.timestamp = Date.now();
    }

    this.updateSkipRequirement(room);
    return room;
  }

  /**
   * Update duration reported by the client's player if duration was unknown
   */
  public updateCurrentSongDuration(code: string, duration: number) {
    const room = this.getRoom(code);
    if (room && room.playback.currentSong && room.playback.currentSong.durationSeconds === 0) {
      room.playback.currentSong.durationSeconds = Math.round(duration);
    }
  }

  /**
   * Set room mode (COLLABORATIVE or DJ_ONLY)
   */
  public setMode(code: string, userId: string, mode: RoomMode): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');
    if (room.hostId !== userId) {
      throw new Error('Solo el anfitrión puede cambiar el modo de la sala');
    }

    room.mode = mode;
    return room;
  }

  /**
   * Check permissions for playback commands
   */
  private assertPlaybackControl(room: RoomState, userId: string) {
    if (room.mode === 'DJ_ONLY' && room.hostId !== userId) {
      throw new Error('Solo el anfitrión (DJ) puede controlar la reproducción');
    }
  }

  private updateSkipRequirement(room: RoomState) {
    const count = room.users.length;
    // Over 50% required to skip
    room.requiredSkipVotes = Math.max(1, Math.ceil(count / 2));
  }

  /**
   * Persist played song to MySQL history
   */
  private async recordSongHistory(roomCode: string, song: Song) {
    try {
      const dbRoom = await prisma.room.findUnique({ where: { code: roomCode } });
      if (dbRoom) {
        await prisma.songHistory.create({
          data: {
            roomId: dbRoom.id,
            youtubeId: song.youtubeId,
            title: song.title,
            channelTitle: song.channelTitle,
            duration: song.durationSeconds,
            thumbnail: song.thumbnail,
            addedBy: song.addedBy.name
          }
        });
      }
    } catch (err) {
      console.error(`[DB Error] Failed to record song history for room ${roomCode}:`, err);
    }
  }

  /**
   * Periodic check: auto-advance when a song with known duration finishes
   */
  private checkPlaybackProgress() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (!room.playback.isPlaying || !room.playback.currentSong) continue;

      const duration = room.playback.currentSong.durationSeconds;
      if (duration > 0) {
        const elapsed = (now - room.playback.timestamp) / 1000;
        const currentPos = room.playback.currentTime + elapsed;

        // Give a 2-second grace period after duration
        if (currentPos >= duration + 2) {
          this.nextSong(room.code);
        }
      }
    }
  }
}
