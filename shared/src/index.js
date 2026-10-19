"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROOM_SETTINGS = void 0;
exports.DEFAULT_ROOM_SETTINGS = {
    maxSongDurationSeconds: 600, // 10 minutes default
    maxSongsPerUserInQueue: 3, // 3 songs max per user default
    preventConsecutiveUserSongs: true, // prevent queue hoarding
    allowDuplicates: false, // no duplicates by default
    allowPlaylists: false, // single songs only
    voteSkipPercentage: 50, // 50% of listeners
    isQueueLocked: false
};
