import React, { useState } from 'react';
import { X, Search, Loader2, Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';
import type { RoomSettings } from '@mirocola/shared';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSettings?: RoomSettings;
  onAddSong: (urlOrQuery: string) => Promise<{ success: boolean; error?: string }>;
}

const PRESET_HITS = [
  { label: 'Cumbia: Los Ángeles Azules', query: 'https://www.youtube.com/watch?v=k76BgIb89-s' },
  { label: 'Rock: Soda Stereo - De Música Ligera', query: 'https://www.youtube.com/watch?v=T_FkEw27XJ0' },
  { label: 'Synthwave: The Weeknd - Blinding Lights', query: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ' },
  { label: 'Salsa: Marc Anthony - Vivir Mi Vida', query: 'https://www.youtube.com/watch?v=YXnjy5YlDwk' },
  { label: 'Lo-Fi Chill Beats', query: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }
];

export const AddSongModal: React.FC<AddSongModalProps> = ({
  isOpen,
  onClose,
  roomSettings,
  onAddSong
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await onAddSong(input.trim());
      if (res.success) {
        setSuccess(true);
        setInput('');
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'No se pudo procesar este enlace');
      }
    } catch (err: any) {
      setError(err.message || 'Error al agregar la canción');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (query: string) => {
    setInput(query);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-purple-800/60 rounded-2xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
            <h3 className="text-lg font-bold text-white">Pedir Canción a la Rocola</h3>
            <p className="text-xs text-slate-400">
              Pega el enlace de una canción o video individual de YouTube.
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
              • Solo canciones individuales (no playlists completas)
              {roomSettings.preventConsecutiveUserSongs ? ' • Turnos alternados' : ''}
            </span>
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            ¡Canción agregada con éxito a la rocola!
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/60 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-white placeholder-slate-500 text-sm outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Sugerencias para animar la sala:</span>
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

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando y agregando...</span>
                </>
              ) : (
                <span>Agregar a la Cola</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
