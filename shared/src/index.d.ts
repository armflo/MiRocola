export type RoomMode = 'COLLABORATIVE' | 'DJ_ONLY';
export interface User {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    joinedAt: number;
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
    upvotes: string[];
}
export interface PlaybackState {
    currentSong: Song | null;
    isPlaying: boolean;
    currentTime: number;
    timestamp: number;
    playbackRate: number;
}
export interface RoomState {
    code: string;
    name: string;
    hostId: string;
    mode: RoomMode;
    playback: PlaybackState;
    queue: Song[];
    users: User[];
    skipVotes: string[];
    requiredSkipVotes: number;
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
export interface ServerToClientEvents {
    'room:sync': (state: RoomState) => void;
    'room:error': (message: string) => void;
    'playback:sync': (playback: PlaybackState) => void;
    'queue:update': (queue: Song[]) => void;
    'users:update': (users: User[]) => void;
    'chat:message': (message: ChatMessage) => void;
    'reaction:new': (reaction: ReactionEvent) => void;
    'skip:update': (skipVotes: string[], required: number) => void;
    'host:changed': (newHost: User) => void;
}
export interface ClientToServerEvents {
    'room:join': (payload: {
        code: string;
        userName: string;
        avatar?: string;
    }, callback: (response: {
        success: boolean;
        state?: RoomState;
        error?: string;
    }) => void) => void;
    'room:create': (payload: {
        roomName: string;
        userName: string;
        avatar?: string;
        mode?: RoomMode;
    }, callback: (response: {
        success: boolean;
        code?: string;
        state?: RoomState;
        error?: string;
    }) => void) => void;
    'playback:play': (currentTime?: number) => void;
    'playback:pause': (currentTime?: number) => void;
    'playback:seek': (time: number) => void;
    'playback:next': () => void;
    'queue:add': (urlOrQuery: string, callback: (response: {
        success: boolean;
        song?: Song;
        error?: string;
    }) => void) => void;
    'queue:remove': (songId: string) => void;
    'queue:upvote': (songId: string) => void;
    'queue:voteSkip': () => void;
    'chat:send': (text: string) => void;
    'reaction:send': (emoji: string) => void;
    'room:setMode': (mode: RoomMode) => void;
}
