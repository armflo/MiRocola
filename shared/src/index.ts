export type RoomMode = 'COLLABORATIVE' | 'DJ_ONLY';

export type RoomTheme = 'neon' | 'retro' | 'emerald' | 'midnight' | 'sunset';

export interface RoomSettings {
  theme: RoomTheme;
  maxSongDurationSeconds: number; // 0 = unlimited, e.g. 600 (10 mins)
  maxSongsPerUserInQueue: number; // 0 = unlimited, e.g. 3
  preventConsecutiveUserSongs: boolean; // true = cannot queue twice in a row
  allowDuplicates: boolean; // false = disallow same song in queue/playing
  allowPlaylists: boolean; // false = only single songs allowed
  voteSkipPercentage: number; // e.g. 50 (%)
  isQueueLocked: boolean; // true = no new songs can be added
  autoDjEnabled: boolean; // true = Auto-DJ picks songs when queue is empty
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  theme: 'neon',
  maxSongDurationSeconds: 600, // 10 minutes default
  maxSongsPerUserInQueue: 3, // 3 songs max per user default
  preventConsecutiveUserSongs: true, // prevent queue hoarding
  allowDuplicates: false, // no duplicates by default
  allowPlaylists: false, // single songs only
  voteSkipPercentage: 50, // 50% of listeners
  isQueueLocked: false,
  autoDjEnabled: true
};

export interface User {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  joinedAt: number;
  persistentId?: number;
  djScore?: number;
  username?: string;
}

// Authentication & Profile Types
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  avatar: string;
  bio?: string | null;
  djScore: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  avatar?: string;
  bio?: string;
}

export interface LoginPayload {
  emailOrUsername: string;
  password: string;
}

export interface UpdateProfilePayload {
  username?: string;
  avatar?: string;
  bio?: string;
}

// Playlist & Social Types
export interface PlaylistSongDto {
  id?: number;
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: number;
  orderIndex?: number;
}

export interface PlaylistDto {
  id: number;
  userId: number;
  authorName: string;
  authorAvatar: string;
  title: string;
  description?: string | null;
  slug: string;
  isPublic: boolean;
  likesCount: number;
  hasLiked?: boolean;
  songsCount: number;
  songs?: PlaylistSongDto[];
  createdAt: string;
}

export interface CommentDto {
  id: number;
  userId: number;
  username: string;
  avatar: string;
  content: string;
  createdAt: string;
}

export interface Song {
  id: string;
  youtubeId: string;
  url: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnail: string;
  addedBy: {
    id: string;
    name: string;
  };
  addedAt: number;
  upvotes: string[]; // array of user IDs who upvoted
}

export interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number; // in seconds
  timestamp: number; // server epoch timestamp in ms when currentTime was set
  playbackRate: number;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  mode: RoomMode;
  settings: RoomSettings;
  playback: PlaybackState;
  queue: Song[];
  history: Song[]; // List of already played songs
  users: User[];
  skipVotes: string[]; // user IDs who voted to skip current song
  requiredSkipVotes: number;
  lastActivityAt?: number;
}

export interface ChatMessage {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  user: {
    id: string;
    name: string;
  };
  timestamp: number;
}

export type SoundEffectId = 'airhorn' | 'applause' | 'scratch' | 'siren' | 'badumtss';

export interface SoundboardEvent {
  id: string;
  soundId: SoundEffectId;
  user: {
    id: string;
    name: string;
  };
  timestamp: number;
}

export interface YouTubeSearchResult {
  youtubeId: string;
  url: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnail: string;
}

export interface VoiceUser {
  userId: string;
  socketId: string;
  userName: string;
  avatar: string;
  isMuted: boolean;
  isSpeaking?: boolean;
}

// Socket Events Definition
export interface ServerToClientEvents {
  'room:sync': (state: RoomState) => void;
  'room:error': (message: string) => void;
  'room:settingsUpdated': (settings: RoomSettings) => void;
  'playback:sync': (playback: PlaybackState) => void;
  'queue:update': (queue: Song[]) => void;
  'history:update': (history: Song[]) => void;
  'users:update': (users: User[]) => void;
  'chat:message': (message: ChatMessage) => void;
  'reaction:new': (reaction: ReactionEvent) => void;
  'soundboard:played': (event: SoundboardEvent) => void;
  'skip:update': (skipVotes: string[], required: number) => void;
  'host:changed': (newHost: User) => void;
  'inactivity:warning': (data: { remainingSeconds: number; message: string }) => void;
  'inactivity:cleared': () => void;
  'room:closed': (data: { reason: string; message: string }) => void;
  // Voice chat WebRTC events
  'voice:users': (users: VoiceUser[]) => void;
  'voice:userJoined': (user: VoiceUser) => void;
  'voice:userLeft': (socketId: string) => void;
  'voice:signal': (data: { fromSocketId: string; fromUserId: string; signal: any }) => void;
  'voice:muteChanged': (data: { socketId: string; isMuted: boolean }) => void;
}

export interface ClientToServerEvents {
  'room:join': (
    payload: { code: string; userName: string; avatar?: string; authUser?: AuthUser },
    callback: (response: { success: boolean; state?: RoomState; error?: string }) => void
  ) => void;
  'room:reconnect': (
    payload: { code: string; userId: string; userName: string; avatar?: string },
    callback: (response: { success: boolean; state?: RoomState; error?: string }) => void
  ) => void;
  'room:keepAlive': (callback?: () => void) => void;
  // Voice chat WebRTC client actions
  'voice:join': (payload: { roomCode: string; user: { id: string; name: string; avatar: string } }) => void;
  'voice:leave': () => void;
  'voice:signal': (payload: { targetSocketId: string; signal: any }) => void;
  'voice:mute': (isMuted: boolean) => void;
  'room:create': (
    payload: {
      roomName: string;
      userName: string;
      avatar?: string;
      mode?: RoomMode;
      settings?: Partial<RoomSettings>;
      authUser?: AuthUser;
    },
    callback: (response: { success: boolean; code?: string; state?: RoomState; error?: string }) => void
  ) => void;
  'room:updateSettings': (
    settings: Partial<RoomSettings>,
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  'playback:play': (currentTime?: number) => void;
  'playback:pause': (currentTime?: number) => void;
  'playback:seek': (time: number) => void;
  'playback:next': () => void;
  'playback:fallbackSong': (
    payload: {
      alternativeYoutubeId: string;
      title?: string;
      channelTitle?: string;
      duration?: number;
      thumbnail?: string;
    },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;
  'queue:add': (
    urlOrQuery: string,
    callback: (response: { success: boolean; song?: Song; error?: string }) => void
  ) => void;
  'queue:remove': (songId: string) => void;
  'queue:upvote': (songId: string) => void;
  'queue:voteSkip': () => void;
  'chat:send': (text: string) => void;
  'reaction:send': (emoji: string) => void;
  'soundboard:play': (soundId: SoundEffectId) => void;
  'youtube:search': (
    query: string,
    callback: (response: { success: boolean; results?: YouTubeSearchResult[]; error?: string }) => void
  ) => void;
  'room:setMode': (mode: RoomMode) => void;
}
