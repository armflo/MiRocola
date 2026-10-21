export type RoomMode = 'COLLABORATIVE' | 'DJ_ONLY';
export type RoomTheme = 'neon' | 'retro' | 'emerald' | 'midnight' | 'sunset';
export interface RoomSettings {
    theme: RoomTheme;
    maxSongDurationSeconds: number;
    maxSongsPerUserInQueue: number;
    preventConsecutiveUserSongs: boolean;
    allowDuplicates: boolean;
    allowPlaylists: boolean;
    voteSkipPercentage: number;
    isQueueLocked: boolean;
    autoDjEnabled: boolean;
}
export declare const DEFAULT_ROOM_SETTINGS: RoomSettings;
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
    settings: RoomSettings;
    playback: PlaybackState;
    queue: Song[];
    history: Song[];
    users: User[];
    skipVotes: string[];
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
export type SoundEffectId = 'airhorn' | 'applause' | 'scratch' | 'siren' | 'badumtss' | 'drop' | 'bell' | 'laser' | 'rewind' | 'cheer';
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
export type MiniGameType = 'quiz' | 'clash' | 'roulette';
export interface QuizOption {
    id: string;
    title: string;
    artist: string;
}
export interface QuizScoreItem {
    userId: string;
    userName: string;
    avatar: string;
    score: number;
    streak: number;
    lastAnswerCorrect?: boolean;
}
export interface QuizGameState {
    round: number;
    totalRounds: number;
    snippetYoutubeId: string;
    snippetStartSeconds: number;
    options: QuizOption[];
    correctOptionId: string | null;
    timeRemaining: number;
    isRoundActive: boolean;
    scores: Record<string, QuizScoreItem>;
    winner?: QuizScoreItem;
}
export interface ClashParticipant {
    userId: string;
    userName: string;
    avatar: string;
    song?: {
        youtubeId: string;
        title: string;
        artist: string;
        thumbnail: string;
    };
    votes: number;
}
export interface ClashGameState {
    player1: ClashParticipant;
    player2: ClashParticipant;
    stage: 'nominating' | 'battling' | 'finished';
    currentBattlingPlayer?: 'player1' | 'player2';
    timeRemaining: number;
    userVotes: Record<string, 'player1' | 'player2'>;
    winner?: 'player1' | 'player2' | 'tie';
}
export interface RouletteChallenge {
    id: string;
    title: string;
    description: string;
    category: 'vocal' | 'memory' | 'dedication' | 'punishment';
    emoji: string;
}
export interface RouletteGameState {
    isSpinning: boolean;
    selectedUserId?: string;
    selectedUserName?: string;
    selectedUserAvatar?: string;
    challenge?: RouletteChallenge;
    spinTimestamp?: number;
}
export interface ActiveRoomGame {
    type: MiniGameType;
    quiz?: QuizGameState;
    clash?: ClashGameState;
    roulette?: RouletteGameState;
}
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
    'inactivity:warning': (data: {
        remainingSeconds: number;
        message: string;
    }) => void;
    'inactivity:cleared': () => void;
    'room:closed': (data: {
        reason: string;
        message: string;
    }) => void;
    'voice:users': (users: VoiceUser[]) => void;
    'voice:userJoined': (user: VoiceUser) => void;
    'voice:userLeft': (socketId: string) => void;
    'voice:signal': (data: {
        fromSocketId: string;
        fromUserId: string;
        signal: any;
    }) => void;
    'voice:muteChanged': (data: {
        socketId: string;
        isMuted: boolean;
    }) => void;
    'game:update': (game: ActiveRoomGame | null) => void;
    'game:notification': (data: {
        title: string;
        message: string;
        emoji: string;
    }) => void;
}
export interface ClientToServerEvents {
    'room:join': (payload: {
        code: string;
        userName: string;
        avatar?: string;
        authUser?: AuthUser;
    }, callback: (response: {
        success: boolean;
        state?: RoomState;
        error?: string;
    }) => void) => void;
    'room:reconnect': (payload: {
        code: string;
        userId: string;
        userName: string;
        avatar?: string;
    }, callback: (response: {
        success: boolean;
        state?: RoomState;
        error?: string;
    }) => void) => void;
    'room:keepAlive': (callback?: () => void) => void;
    'voice:join': (payload: {
        roomCode: string;
        user: {
            id: string;
            name: string;
            avatar: string;
        };
    }) => void;
    'voice:leave': () => void;
    'voice:signal': (payload: {
        targetSocketId: string;
        signal: any;
    }) => void;
    'voice:mute': (isMuted: boolean) => void;
    'game:start': (payload: {
        type: MiniGameType;
        opponentUserId?: string;
    }, callback?: (response: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'game:end': (callback?: (response: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'game:quizAnswer': (optionId: string) => void;
    'game:clashNominate': (songQueryOrUrl: string) => void;
    'game:clashVote': (choice: 'player1' | 'player2') => void;
    'game:spinRoulette': () => void;
    'room:create': (payload: {
        roomName: string;
        userName: string;
        avatar?: string;
        mode?: RoomMode;
        settings?: Partial<RoomSettings>;
        authUser?: AuthUser;
    }, callback: (response: {
        success: boolean;
        code?: string;
        state?: RoomState;
        error?: string;
    }) => void) => void;
    'room:updateSettings': (settings: Partial<RoomSettings>, callback: (response: {
        success: boolean;
        error?: string;
    }) => void) => void;
    'playback:play': (currentTime?: number) => void;
    'playback:pause': (currentTime?: number) => void;
    'playback:seek': (time: number) => void;
    'playback:next': () => void;
    'playback:fallbackSong': (payload: {
        alternativeYoutubeId: string;
        title?: string;
        channelTitle?: string;
        duration?: number;
        thumbnail?: string;
    }, callback?: (response: {
        success: boolean;
        error?: string;
    }) => void) => void;
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
    'soundboard:play': (soundId: SoundEffectId) => void;
    'youtube:search': (query: string, callback: (response: {
        success: boolean;
        results?: YouTubeSearchResult[];
        error?: string;
    }) => void) => void;
    'room:setMode': (mode: RoomMode) => void;
}
