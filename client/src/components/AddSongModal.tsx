import React, { useState } from 'react';
import {
  X,
  Search,
  Loader2,
  Sparkles,
  CheckCircle,
  ShieldAlert,
  Plus,
  Check
} from 'lucide-react';
import type { RoomSettings, YouTubeSearchResult } from '@mirocola/shared';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSettings?: RoomSettings;
  onAddSong: (urlOrQuery: string) => Promise<{ success: boolean; error?: string }>;
  onSearchYouTube?: (query: string) => Promise<YouTubeSearchResult[]>;
}

const PRESET_HITS = [
  { label: 'Cumbia: Los Ángeles Azules', query: 'Los Angeles Azules 17 anos' },
  { label: 'Rock: Soda Stereo', query: 'Soda Stereo De Musica Ligera' },
  { label: 'Pop: The Weeknd', query: 'The Weeknd Blinding Lights' },
  { label: 'Salsa: Marc Anthony', query: 'Marc Anthony Vivir Mi Vida' },
  { label: 'Lo-Fi Chill Beats', query: 'Lofi hip hop beats chill' }
];

export const AddSongModal: React.FC<AddSongModalProps> = ({
  isOpen,
  onClose,
  roomSettings,
  onAddSong,
  onSearchYouTube
}) => {
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [addedSongId, setAddedSongId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const isUrl = input.includes('youtube.com/') || input.includes('youtu.be/');

  // Handle direct addition or trigger search
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching || isAdding) return;

    if (isUrl) {
      await addSingleSong(input.trim());
    } else {
      await performSearch(input.trim());
    }
  };

  const performSearch = async (query: string) => {
    if (!onSearchYouTube || !query.trim()) return;
    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const results = await onSearchYouTube(query.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setError('No se encontraron videos para esta búsqueda. Intenta con otros términos.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar en YouTube');
    } finally {
      setIsSearching(false);
    }
  };

  const addSingleSong = async (urlOrId: string, resultId?: string) => {
    setIsAdding(true);
    setError(null);

    try {
      const res = await onAddSong(urlOrId);
      if (res.success) {
        if (resultId) {
          setAddedSongId(resultId);
        } else {
          setSuccess(true);
        }
        setTimeout(() => {
          setSuccess(false);
          setAddedSongId(null);
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'No se pudo agregar esta canción');
      }
    } catch (err: any) {
      setError(err.message || 'Error al agregar la canción');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSelectPreset = (query: string) => {
    setInput(query);
    performSearch(query);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-purple-800/60 rounded-2xl p-5 sm:p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 flex-shrink-0">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Pedir Canción a la Rocola</h3>
            <p className="text-xs text-slate-400">
              Busca por nombre de canción/artista o pega un enlace de YouTube.
            </p>
          </div>
        </div>

        {/* Active room limitations banner */}
        {roomSettings && (
          <div className="mb-4 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200 flex flex-wrap items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
            <span>
              {roomSettings.maxSongDurationSeconds > 0
                ? `Duración máx: ${Math.floor(roomSettings.maxSongDurationSeconds / 60)} min`
                : 'Duración libre'}{' '}
              • Solo canciones individuales (no playlists)
              {roomSettings.preventConsecutiveUserSongs ? ' • Turnos alternados' : ''}
            </span>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Feedback */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            ¡Canción agregada con éxito a la rocola!
          </div>
        )}

        {/* Input Form with Search/Add Button */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                placeholder="Busca ej. 'Soda Stereo' o pega enlace https://..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-white placeholder-slate-500 text-xs sm:text-sm outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="submit"
              disabled={isSearching || isAdding || !input.trim()}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
            >
              {isSearching || isAdding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : isUrl ? (
                <span>Agregar Enlace</span>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Sugerencias para buscar con 1 clic:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_HITS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset.query)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-purple-950 border border-purple-900/30 hover:border-purple-600/50 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Integrated Search Results List */}
        {searchResults.length > 0 && (
          <div className="mt-5 pt-4 border-t border-purple-900/30">
            <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
              <span>Resultados de YouTube:</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                {searchResults.length} canciones
              </span>
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {searchResults.map((item) => {
                const isJustAdded = addedSongId === item.youtubeId;
                return (
                  <div
                    key={item.youtubeId}
                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-purple-900/30 hover:border-purple-700/50 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.durationFormatted && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                          {item.durationFormatted}
                        </span>
                      )}
                    </div>

                    {/* Title & Channel */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-slate-100 truncate">
                        {item.title}
                      </h5>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.channelTitle}
                      </p>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => addSingleSong(item.url, item.youtubeId)}
                      disabled={isAdding || isJustAdded}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-purple-950/80 hover:bg-pink-600 border border-purple-800/60 hover:border-pink-500 text-purple-200 hover:text-white'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Agregada!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pedir</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
