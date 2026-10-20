import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Share2,
  Check,
  Play,
  MessageSquare,
  Send,
  Loader2,
  Trash2
} from 'lucide-react';
import type { PlaylistDto, CommentDto, AuthUser } from '@mirocola/shared';
import { playlistService } from '../services/playlist';
import { formatTime } from '../lib/utils';

interface PlaylistViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistIdOrSlug: string | number | null;
  authUser?: AuthUser | null;
  onRequireAuth?: () => void;
  onLoadSongsToQueue?: (urls: string[]) => void;
  onPlaylistDeleted?: (id: number) => void;
}

export const PlaylistViewModal: React.FC<PlaylistViewModalProps> = ({
  isOpen,
  onClose,
  playlistIdOrSlug,
  authUser,
  onRequireAuth,
  onLoadSongsToQueue,
  onPlaylistDeleted
}) => {
  const [playlist, setPlaylist] = useState<PlaylistDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen || !playlistIdOrSlug) return;
    setIsLoading(true);
    playlistService.getPlaylist(playlistIdOrSlug).then((res) => {
      setIsLoading(false);
      if (res.success && res.playlist) {
        setPlaylist(res.playlist);
        setComments(res.comments || []);
      }
    });
  }, [isOpen, playlistIdOrSlug]);

  if (!isOpen || !playlistIdOrSlug) return null;

  const handleToggleLike = async () => {
    if (!authUser) {
      onRequireAuth?.();
      return;
    }
    if (!playlist || isLiking) return;

    setIsLiking(true);
    const res = await playlistService.toggleLike(playlist.id);
    setIsLiking(false);

    if (res.success && typeof res.likesCount === 'number') {
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              hasLiked: res.hasLiked,
              likesCount: res.likesCount!
            }
          : prev
      );
    }
  };

  const handleCopyShare = () => {
    if (!playlist) return;
    const url = `${window.location.origin}/?playlist=${playlist.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      onRequireAuth?.();
      return;
    }
    if (!commentText.trim() || !playlist || isSendingComment) return;

    setIsSendingComment(true);
    const res = await playlistService.addComment(playlist.id, commentText);
    setIsSendingComment(false);

    if (res.success && res.comment) {
      setComments((prev) => [res.comment!, ...prev]);
      setCommentText('');
    }
  };

  const handleDelete = async () => {
    if (!playlist || isDeleting) return;
    if (!confirm('¿Seguro que deseas eliminar esta playlist?')) return;

    setIsDeleting(true);
    const success = await playlistService.deletePlaylist(playlist.id);
    setIsDeleting(false);

    if (success) {
      onPlaylistDeleted?.(playlist.id);
      onClose();
    }
  };

  const handleLoadAll = () => {
    if (!playlist?.songs || !onLoadSongsToQueue) return;
    const urls = playlist.songs.map((s) => `https://www.youtube.com/watch?v=${s.youtubeId}`);
    onLoadSongsToQueue(urls);
    onClose();
  };

  const isOwner = authUser && playlist && authUser.id === playlist.userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto bg-slate-900 border border-purple-800/60 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            <p className="text-xs text-slate-400">Cargando playlist...</p>
          </div>
        ) : !playlist ? (
          <div className="py-16 text-center">
            <p className="text-sm text-red-400 font-semibold mb-3">No se pudo encontrar la playlist.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800/50 text-pink-400 font-bold">
                  {playlist.isPublic ? 'Playlist Pública' : 'Playlist Privada'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {playlist.songsCount} temas
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {playlist.title}
              </h2>

              {playlist.description && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {playlist.description}
                </p>
              )}

              {/* Author & Actions row */}
              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-purple-900/30 flex-wrap">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <img
                    src={playlist.authorAvatar}
                    alt={playlist.authorName}
                    className="w-7 h-7 rounded-full border border-pink-500/60 object-cover"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    @{playlist.authorName}
                  </span>
                </div>

                {/* Buttons: Like, Share, Delete */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      playlist.hasLiked
                        ? 'bg-pink-600/20 border-pink-500 text-pink-400'
                        : 'bg-slate-950 border-purple-900/40 text-slate-300 hover:border-pink-500/60'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        playlist.hasLiked ? 'fill-pink-500 text-pink-500' : ''
                      }`}
                    />
                    <span>{playlist.likesCount}</span>
                  </button>

                  <button
                    onClick={handleCopyShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 border border-purple-900/40 hover:border-purple-600/60 text-slate-200 transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-pink-400" />
                        <span>Compartir</span>
                      </>
                    )}
                  </button>

                  {isOwner && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      title="Eliminar playlist"
                      className="p-2 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Load into current room button */}
            {onLoadSongsToQueue && playlist.songs && playlist.songs.length > 0 && (
              <button
                onClick={handleLoadAll}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Cargar temas a la cola de la rocola</span>
              </button>
            )}

            {/* Songs list */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Canciones ({playlist.songs?.length || 0})
              </h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(playlist.songs || []).map((song, i) => (
                  <div
                    key={song.id || i}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-purple-900/20 hover:border-purple-800/40 transition-colors"
                  >
                    <span className="text-xs font-mono text-slate-500 w-4 text-center">
                      {i + 1}
                    </span>
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-10 h-7 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {song.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {song.channelTitle}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                      {formatTime(song.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="pt-3 border-t border-purple-900/30">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageSquare className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Comentarios ({comments.length})
                </h3>
              </div>

              {/* Add comment input */}
              <form onSubmit={handleAddComment} className="flex gap-2 mb-3">
                <input
                  type="text"
                  maxLength={500}
                  placeholder={authUser ? "Deja un comentario sobre la playlist..." : "Inicia sesión para comentar"}
                  disabled={!authUser || isSendingComment}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-purple-900/40 text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!authUser || !commentText.trim() || isSendingComment}
                  className="px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Comments list */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">
                    Aún no hay comentarios. ¡Sé el primero en comentar!
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-purple-900/20 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={c.avatar}
                            alt={c.username}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="font-bold text-slate-300">@{c.username}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-200 pl-5.5 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
