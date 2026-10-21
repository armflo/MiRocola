import {
  RoomState,
  Song,
  User,
  RoomMode,
  PlaybackState,
  RoomSettings,
  DEFAULT_ROOM_SETTINGS,
  AuthUser
} from '@mirocola/shared';
import { prisma } from '../config/db.js';
import { YouTubeService } from './youtubeService.js';
import { AuthService } from './authService.js';

interface SocketSession {
  socketId: string;
  userId: string;
  roomCode: string;
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomState> = new Map();
  private socketSessions: Map<string, SocketSession> = new Map();
  private onPlaybackSync?: (roomCode: string, room: RoomState, autoDjSong?: Song) => void;
  private onInactivityWarning?: (roomCode: string, remainingSeconds: number, message: string) => void;
  private onInactivityCleared?: (roomCode: string) => void;
  private onRoomClosed?: (roomCode: string, message: string) => void;

  private constructor() {
    // Background interval to check song completion and room inactivity
    setInterval(() => this.checkPlaybackProgress(), 1000);
  }

  public setPlaybackSyncCallback(cb: (roomCode: string, room: RoomState, autoDjSong?: Song) => void) {
    this.onPlaybackSync = cb;
  }

  public setInactivityCallbacks(
    onWarning: (roomCode: string, remainingSeconds: number, message: string) => void,
    onCleared: (roomCode: string) => void,
    onClosed: (roomCode: string, message: string) => void
  ) {
    this.onInactivityWarning = onWarning;
    this.onInactivityCleared = onCleared;
    this.onRoomClosed = onClosed;
  }

  public recordActivity(code: string) {
    const room = this.getRoom(code);
    if (!room) return;
    const wasInactive = room.lastActivityAt && Date.now() - room.lastActivityAt > 15 * 60 * 1000;
    room.lastActivityAt = Date.now();
    if (wasInactive && this.onInactivityCleared) {
      this.onInactivityCleared(room.code);
    }
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
    socketId: string,
    customSettings?: Partial<RoomSettings>,
    authUser?: AuthUser
  ): Promise<{ room: RoomState; user: User }> {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const user: User = {
      id: userId,
      name: authUser?.username ? `@${authUser.username}` : (userName.trim() || 'Anfitrión'),
      avatar: authUser?.avatar || avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      isHost: true,
      joinedAt: Date.now(),
      persistentId: authUser?.id,
      username: authUser?.username,
      djScore: authUser?.djScore
    };

    const settings: RoomSettings = {
      ...DEFAULT_ROOM_SETTINGS,
      ...customSettings
    };

    const roomState: RoomState = {
      code,
      name: roomName.trim() || `Rocola ${code}`,
      hostId: userId,
      mode,
      settings,
      playback: {
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        timestamp: Date.now(),
        playbackRate: 1
      },
      queue: [],
      history: [],
      users: [user],
      skipVotes: [],
      requiredSkipVotes: 1,
      lastActivityAt: Date.now()
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
    socketId: string,
    authUser?: AuthUser
  ): { room: RoomState; user: User } {
    const formattedCode = code.toUpperCase().trim();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      throw new Error(`La sala "${formattedCode}" no existe o fue cerrada.`);
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const user: User = {
      id: userId,
      name: authUser?.username ? `@${authUser.username}` : (userName.trim() || 'Invitado'),
      avatar: authUser?.avatar || avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      isHost: false,
      joinedAt: Date.now(),
      persistentId: authUser?.id,
      username: authUser?.username,
      djScore: authUser?.djScore
    };

    room.users.push(user);
    this.updateSkipRequirement(room);
    this.recordActivity(formattedCode);

    this.socketSessions.set(socketId, { socketId, userId, roomCode: formattedCode });

    return { room, user };
  }

  /**
   * Reconnect a user after brief disconnection (e.g. WiFi switch, background mobile tab)
   */
  public reconnectUser(
    code: string,
    userId: string,
    userName: string,
    avatar: string,
    socketId: string
  ): { room: RoomState; user: User } {
    const formattedCode = code.toUpperCase().trim();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      throw new Error(`La sala "${formattedCode}" ya no existe o fue cerrada por inactividad.`);
    }

    this.recordActivity(formattedCode);

    let user = room.users.find((u) => u.id === userId);
    if (!user) {
      user = {
        id: userId,
        name: userName || 'Invitado',
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        isHost: room.users.length === 0, // Restore as host if room was empty
        joinedAt: Date.now()
      };
      room.users.push(user);
      if (user.isHost) {
        room.hostId = user.id;
      }
    }

    this.socketSessions.set(socketId, { socketId, userId, roomCode: formattedCode });
    this.updateSkipRequirement(room);

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

    // If room is empty, keep alive for 20 minutes then cleanup
    if (room.users.length === 0) {
      setTimeout(() => {
        const check = this.rooms.get(room.code);
        if (check && check.users.length === 0) {
          this.rooms.delete(room.code);
          console.log(`[Room Clean] Room ${room.code} cleaned from memory.`);
        }
      }, 20 * 60 * 1000);
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
   * Update Room Settings (Host only)
   */
  public updateSettings(
    code: string,
    userId: string,
    newSettings: Partial<RoomSettings>
  ): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');

    if (room.hostId !== userId) {
      throw new Error('Solo el anfitrión de la sala puede modificar las configuraciones.');
    }

    room.settings = {
      ...room.settings,
      ...newSettings
    };

    this.updateSkipRequirement(room);
    this.recordActivity(code);
    return room;
  }

  /**
   * Add a song to the room queue with strict rule validations
   */
  public async addSong(
    code: string,
    urlOrQuery: string,
    user: { id: string; name: string }
  ): Promise<{ room: RoomState; song: Song }> {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');

    // Rule 1: Queue lock check
    if (room.settings.isQueueLocked) {
      throw new Error('La cola de pedidos está cerrada temporalmente por el anfitrión.');
    }

    // Rule 2: Max songs per user in queue
    if (room.settings.maxSongsPerUserInQueue > 0) {
      const userSongsCount = room.queue.filter((s) => s.addedBy.id === user.id).length;
      if (userSongsCount >= room.settings.maxSongsPerUserInQueue) {
        throw new Error(
          `Ya tienes ${userSongsCount} canciones en la cola. El límite por persona es de ${room.settings.maxSongsPerUserInQueue}.`
        );
      }
    }

    // Rule 3: Anti-consecutive song monopolization
    if (room.settings.preventConsecutiveUserSongs && room.users.length > 1) {
      const lastQueuedSong =
        room.queue.length > 0 ? room.queue[room.queue.length - 1] : room.playback.currentSong;
      if (lastQueuedSong && lastQueuedSong.addedBy.id === user.id) {
        throw new Error(
          'No puedes agregar dos canciones seguidas para evitar monopolizar la rocola. Dale turno a tus amigos.'
        );
      }
    }

    // Extract metadata & duration
    const meta = await YouTubeService.getVideoMeta(urlOrQuery);

    // Rule 4: Song duration limit
    if (
      room.settings.maxSongDurationSeconds > 0 &&
      meta.durationSeconds > room.settings.maxSongDurationSeconds
    ) {
      const maxMins = Math.floor(room.settings.maxSongDurationSeconds / 60);
      const songMins = Math.floor(meta.durationSeconds / 60);
      const songSecs = meta.durationSeconds % 60;
      throw new Error(
        `Esta canción dura ${songMins}m ${songSecs < 10 ? '0' : ''}${songSecs}s, pero el anfitrión estableció un límite máximo de ${maxMins} minutos.`
      );
    }

    // Rule 5: Duplicate songs check
    if (!room.settings.allowDuplicates) {
      const isCurrentlyPlaying = room.playback.currentSong?.youtubeId === meta.youtubeId;
      const isAlreadyInQueue = room.queue.some((s) => s.youtubeId === meta.youtubeId);
      if (isCurrentlyPlaying || isAlreadyInQueue) {
        throw new Error('Esta canción ya está sonando o en la lista de espera de la rocola.');
      }
    }

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

    this.recordActivity(code);
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
    this.recordActivity(code);
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

      // Award +10 DJ Score to the song author if registered
      const songAuthor = room.users.find((u) => u.id === song.addedBy.id);
      if (songAuthor?.persistentId) {
        AuthService.awardDjPoints(songAuthor.persistentId, 10).catch(() => {});
        if (typeof songAuthor.djScore === 'number') {
          songAuthor.djScore += 10;
        }
      }
    }

    // Sort queue: highest upvotes first, then oldest addedAt
    room.queue.sort((a, b) => {
      if (b.upvotes.length !== a.upvotes.length) {
        return b.upvotes.length - a.upvotes.length;
      }
      return a.addedAt - b.addedAt;
    });

    this.recordActivity(code);
    return room;
  }

  /**
   * Vote to skip current song
   */
  public voteSkip(code: string, userId: string): { room: RoomState; skipped: boolean } {
    const room = this.getRoom(code);
    if (!room || !room.playback.currentSong) return { room: room!, skipped: false };

    this.recordActivity(code);

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
    this.recordActivity(code);

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
    this.recordActivity(code);

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
    this.recordActivity(code);

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

    this.recordActivity(code);

    room.skipVotes = [];

    // Save previous playing song to room's played history
    if (room.playback.currentSong) {
      const prevSong = room.playback.currentSong;
      room.history.unshift({ ...prevSong });
      if (room.history.length > 50) {
        room.history.pop();
      }

      // Award +20 DJ Score points for completed playback to registered requester
      const songAuthor = room.users.find((u) => u.id === prevSong.addedBy.id);
      if (songAuthor?.persistentId) {
        AuthService.awardDjPoints(songAuthor.persistentId, 20).catch(() => {});
        if (typeof songAuthor.djScore === 'number') {
          songAuthor.djScore += 20;
        }
      }
    }

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
   * Replaces current song with an alternative compatible YouTube video
   * (e.g. When official video is blocked by record label copyright on embeds)
   */
  public replaceCurrentSong(
    code: string,
    newSongData: {
      youtubeId: string;
      title?: string;
      channelTitle?: string;
      durationSeconds?: number;
      thumbnail?: string;
    }
  ): RoomState {
    const room = this.getRoom(code);
    if (!room) throw new Error('Sala no encontrada');
    if (!room.playback.currentSong) throw new Error('No hay canción activa para reemplazar');

    room.playback.currentSong = {
      ...room.playback.currentSong,
      youtubeId: newSongData.youtubeId,
      title: newSongData.title || room.playback.currentSong.title,
      channelTitle: newSongData.channelTitle || room.playback.currentSong.channelTitle,
      durationSeconds: newSongData.durationSeconds || room.playback.currentSong.durationSeconds,
      thumbnail: newSongData.thumbnail || room.playback.currentSong.thumbnail,
      url: `https://www.youtube.com/watch?v=${newSongData.youtubeId}`
    };
    room.playback.currentTime = 0;
    room.playback.timestamp = Date.now();
    room.playback.isPlaying = true;
    room.skipVotes = [];

    this.recordActivity(code);
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
    const percentage = room.settings?.voteSkipPercentage || 50;
    // Calculate required votes based on room settings percentage
    room.requiredSkipVotes = Math.max(1, Math.ceil((count * percentage) / 100));
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
   * Periodic check: auto-advance when a song with known duration finishes,
   * and monitor room inactivity (warning countdown at 15m, auto-close at 20m of total silence)
   */
  private checkPlaybackProgress() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      // 1. Inactivity tracking
      if (room.playback.isPlaying && room.playback.currentSong) {
        // As long as music is playing, the room is active!
        room.lastActivityAt = now;
      } else {
        // Inactive silence (empty queue or paused)
        const lastAct = room.lastActivityAt || now;
        const idleMs = now - lastAct;
        const WARNING_MS = 15 * 60 * 1000; // 15 mins
        const TIMEOUT_MS = 20 * 60 * 1000; // 20 mins

        if (idleMs >= TIMEOUT_MS) {
          console.log(`[Room Manager] Room ${room.code} closed due to 20m inactivity.`);
          if (this.onRoomClosed) {
            this.onRoomClosed(
              room.code,
              'La sala fue cerrada automáticamente tras 20 minutos de inactividad.'
            );
          }
          this.rooms.delete(room.code);
          continue;
        } else if (idleMs >= WARNING_MS) {
          const remainingSecs = Math.max(1, Math.round((TIMEOUT_MS - idleMs) / 1000));
          if (this.onInactivityWarning) {
            this.onInactivityWarning(
              room.code,
              remainingSecs,
              `Esta sala se cerrará automáticamente en ${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s por inactividad.`
            );
          }
        }
      }

      // 2. Playback progress checking
      if (!room.playback.isPlaying || !room.playback.currentSong) continue;

      const duration = room.playback.currentSong.durationSeconds;
      if (duration > 0) {
        const elapsed = (now - room.playback.timestamp) / 1000;
        const currentPos = room.playback.currentTime + elapsed;

        // Give a 2-second grace period after duration
        if (currentPos >= duration + 2) {
          const updated = this.nextSong(room.code);
          if (this.onPlaybackSync) {
            this.onPlaybackSync(room.code, updated);
          }
          if (!updated.playback.currentSong && updated.settings.autoDjEnabled) {
            this.triggerAutoDj(room.code).then((res) => {
              if (res && this.onPlaybackSync) {
                this.onPlaybackSync(room.code, res.room, res.song);
              }
            });
          }
        }
      }
    }
  }

  /**
   * Auto-DJ: Automatically search and queue matching music when queue runs dry
   */
  public async triggerAutoDj(code: string): Promise<{ room: RoomState; song: Song } | null> {
    const room = this.getRoom(code);
    if (!room || !room.settings.autoDjEnabled) return null;

    // Search query inspired by previous song or popular party vibes
    let query = 'exitos latinos fiesta mix';
    const recentSong = room.playback.currentSong || (room.history.length > 0 ? room.history[0] : null);
    if (recentSong) {
      const cleanTitle = recentSong.title
        .replace(/(\[.*?\]|\(.*?\)|official|video|audio|lyric|remix|hd|4k)/gi, '')
        .trim();
      query = recentSong.channelTitle ? `${recentSong.channelTitle} canciones` : `${cleanTitle} mix`;
    }

    try {
      const results = await YouTubeService.searchVideos(query, 10);
      if (!results || results.length === 0) return null;

      // Filter out songs already played recently or in queue
      const existingIds = new Set<string>([
        ...(room.playback.currentSong ? [room.playback.currentSong.youtubeId] : []),
        ...room.queue.map((s) => s.youtubeId),
        ...room.history.map((s) => s.youtubeId)
      ]);

      const candidates = results.filter((r) => {
        if (existingIds.has(r.youtubeId)) return false;
        // Avoid ultra short or ultra long compilations
        if (r.durationSeconds > 0 && (r.durationSeconds < 60 || r.durationSeconds > 600)) {
          return false;
        }
        return true;
      });

      const chosen = candidates[0] || results[0];
      if (!chosen) return null;

      const autoDjUser = { id: 'autodj', name: '🤖 Auto-DJ' };
      const song: Song = {
        id: `song_autodj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        youtubeId: chosen.youtubeId,
        url: chosen.url,
        title: chosen.title,
        channelTitle: chosen.channelTitle,
        durationSeconds: chosen.durationSeconds || 180,
        thumbnail: chosen.thumbnail,
        addedBy: autoDjUser,
        addedAt: Date.now(),
        upvotes: []
      };

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
    } catch (err) {
      console.error(`[Auto-DJ Error for room ${code}]:`, err);
      return null;
    }
  }

  /**
   * Get list of active public rooms for the Lobby Directory
   */
  public getPublicRooms() {
    const list: Array<{
      code: string;
      name: string;
      userCount: number;
      currentSong: {
        title: string;
        channelTitle: string;
        thumbnail: string;
      } | null;
      mode: RoomMode;
    }> = [];

    for (const room of this.rooms.values()) {
      if (room.users.length > 0) {
        list.push({
          code: room.code,
          name: room.name,
          userCount: room.users.length,
          currentSong: room.playback.currentSong
            ? {
                title: room.playback.currentSong.title,
                channelTitle: room.playback.currentSong.channelTitle,
                thumbnail: room.playback.currentSong.thumbnail
              }
            : null,
          mode: room.mode
        });
      }
    }

    return list.sort((a, b) => b.userCount - a.userCount);
  }
}
