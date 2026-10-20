import React, { useState } from 'react';
import {
  X,
  ListMusic,
  Lock,
  Globe,
  Loader2,
  Sparkles,
  Check,
  Share2
} from 'lucide-react';
import type { Song, AuthUser, PlaylistDto } from '@mirocola/shared';
import { playlistService } from '../services/playlist';
import { formatTime } from '../lib/utils';
import confetti from 'canvas-confetti';

interface SavePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  authUser?: AuthUser | null;
  onRequireAuth: () => void;
  onPlaylistCreated?: (playlist: PlaylistDto) => void;
}

export const SavePlaylistModal: React.FC<SavePlaylistModalProps> = ({
  isOpen,
  onClose,
  songs,
  authUser,
  onRequireAuth,
  onPlaylistCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPlaylist, setCreatedPlaylist] = useState<PlaylistDto | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  if (!authUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-sm bg-slate-900 border border-purple-800/60 rounded-3xl p-6 shadow-2xl text-center text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <ListMusic className="w-7 h-7 text-white" />
          </div>

          <h3 className="text-lg font-bold mb-2">¡Crea tu cuenta para guardar playlists!</h3>
          <p className="text-xs text-slate-300 mb-6 leading-relaxed">
            Guarda tus rocolas favoritas, compártelas con amigos con un enlace único, recibe comentarios y gana <span className="text-amber-400 font-bold">+25 Puntos de DJ</span>.
          </p>

          <button
            onClick={() => {
              onClose();
              onRequireAuth();
            }}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            Crear Cuenta Gratis
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Escribe un nombre para la playlist');
      return;
    }

    if (songs.length === 0) {
      setError('No hay canciones en la lista para guardar');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formattedSongs = songs.map((s) => ({
      youtubeId: s.youtubeId,
      title: s.title,
      channelTitle: s.channelTitle,
      thumbnail: s.thumbnail,
      duration: s.durationSeconds
    }));

    const res = await playlistService.createPlaylist({
      title: title.trim(),
      description: description.trim() || undefined,
      isPublic,
      songs: formattedSongs
    });

    setIsLoading(false);

    if (res.success && res.playlist) {
      setCreatedPlaylist(res.playlist);
      onPlaylistCreated?.(res.playlist);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      setError(res.error || 'Error al guardar la playlist');
    }
  };

  const handleCopyLink = () => {
    if (!createdPlaylist) return;
    const url = `${window.location.origin}/p/${createdPlaylist.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-slate-900 border border-purple-800/60 rounded-3xl p-5 sm:p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success View */}
        {createdPlaylist ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-xl font-bold mb-1">¡Playlist Guardada!</h3>
            <p className="text-xs text-amber-300 font-bold mb-4">
              ⭐ ¡Has ganado +25 Puntos de DJ!
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-900/40 text-left mb-5">
              <h4 className="text-sm font-bold text-white truncate">{createdPlaylist.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{createdPlaylist.songsCount} canciones guardadas</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-purple-950/80 hover:bg-purple-900/80 border border-purple-700/60 text-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>¡Enlace de playlist copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-pink-400" />
                    <span>Copiar Enlace para Compartir</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 rounded-2xl bg-purple-950 text-pink-400 border border-purple-800/40">
                <ListMusic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Guardar como Playlist</h3>
                <p className="text-xs text-slate-400">{songs.length} canciones seleccionadas</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Playlist *
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="Ej. Temazos de Fiesta 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-purple-900/50 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-slate-100 text-xs outline-none transition-all placeholder-slate-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  maxLength={200}
                  rows={2}
                  placeholder="Una breve descripción para que otros sepan de qué va..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-purple-900/50 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-slate-100 text-xs outline-none transition-all placeholder-slate-500 resize-none"
                />
              </div>

              {/* Public toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-purple-900/30">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {isPublic ? 'Pública' : 'Privada'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {isPublic
                        ? 'Visible en la comunidad y con enlace para compartir'
                        : 'Solo tú podrás verla en tu perfil'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-pink-500 cursor-pointer"
                />
              </div>

              {/* Songs preview snippet */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Canciones incluidas ({songs.length}):
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-slate-950/50 rounded-xl p-2 border border-purple-900/20">
                  {songs.map((song, i) => (
                    <div
                      key={song.id || i}
                      className="flex items-center gap-2 text-[11px] text-slate-300 py-1"
                    >
                      <span className="text-[10px] text-slate-500 font-mono w-4">{i + 1}.</span>
                      <span className="truncate flex-1 font-medium">{song.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatTime(song.durationSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !title.trim() || songs.length === 0}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Guardar Playlist (+25 pts DJ)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
