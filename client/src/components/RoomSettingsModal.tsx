import React, { useState } from 'react';
import {
  X,
  Settings,
  Clock,
  Shuffle,
  ListPlus,
  CopyX,
  Lock,
  Unlock,
  Percent,
  ShieldCheck,
  Check,
  Loader2,
  Palette
} from 'lucide-react';
import type { RoomSettings, RoomMode, RoomTheme } from '@mirocola/shared';
import { THEMES } from '../lib/theme';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: RoomSettings;
  currentMode: RoomMode;
  onUpdateSettings: (settings: Partial<RoomSettings>) => Promise<boolean>;
  onUpdateMode: (mode: RoomMode) => void;
}

const DURATION_OPTIONS = [
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '8 min', value: 480 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '20 min', value: 1200 },
  { label: 'Sin límite', value: 0 }
];

const MAX_SONGS_OPTIONS = [
  { label: '1 canción', value: 1 },
  { label: '2 canciones', value: 2 },
  { label: '3 canciones', value: 3 },
  { label: '5 canciones', value: 5 },
  { label: 'Sin límite', value: 0 }
];

const VOTE_SKIP_OPTIONS = [
  { label: '30%', value: 30 },
  { label: '50% (Mayoría)', value: 50 },
  { label: '66% (2/3)', value: 66 },
  { label: '75%', value: 75 }
];

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentMode,
  onUpdateSettings,
  onUpdateMode
}) => {
  const [settings, setSettings] = useState<RoomSettings>({ ...currentSettings });
  const [mode, setMode] = useState<RoomMode>(currentMode);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    if (mode !== currentMode) {
      onUpdateMode(mode);
    }
    const ok = await onUpdateSettings(settings);
    setIsSaving(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-purple-800/60 rounded-2xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-950/80 text-pink-400 border border-purple-800/40">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Configuraciones de la Sala
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-700/50 font-semibold">
                Solo Anfitrión
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Personaliza las reglas de duración, cola y control de tu rocola.
            </p>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            ¡Configuraciones guardadas correctamente!
          </div>
        )}

        <div className="space-y-5">
          {/* 0. Color & Design Themes */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30">
            <div className="flex items-center gap-2 mb-2.5">
              <Palette className="w-4 h-4 text-pink-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Estilo y Colores de la Rocola
                </h4>
                <p className="text-[11px] text-slate-400">
                  Cambia el ambiente visual para todos los que estén en la sala.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {Object.values(THEMES).map((th) => {
                const isSelected = (settings.theme || 'neon') === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, theme: th.id as RoomTheme }))
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/90 border-pink-500 shadow-md shadow-pink-500/20'
                        : 'bg-slate-900/70 border-slate-800 hover:border-purple-800/60'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${th.previewGradient} flex items-center justify-center text-base flex-shrink-0 shadow-md`}
                    >
                      {th.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">
                          {th.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500 text-white font-bold">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {th.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 1. Límite de tiempo por canción */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Límite de Duración por Canción
                </h4>
                <p className="text-[11px] text-slate-400">
                  Evita que pongan mixes largos o videos de 1 hora.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mt-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, maxSongDurationSeconds: opt.value }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    settings.maxSongDurationSeconds === opt.value
                      ? 'bg-pink-600 border-pink-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Evitar canciones consecutivas del mismo usuario */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Evitar Canciones Consecutivas
                </h4>
                <p className="text-[11px] text-slate-400">
                  Impide que un mismo usuario encole dos temas seguidos para que todos participen.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.preventConsecutiveUserSongs}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    preventConsecutiveUserSongs: e.target.checked
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* 3. Límite de canciones por usuario en la cola */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30">
            <div className="flex items-center gap-2 mb-2">
              <ListPlus className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Máximo de Canciones por Usuario en Cola
                </h4>
                <p className="text-[11px] text-slate-400">
                  Controla cuántas canciones activas puede tener cada persona esperando.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-2">
              {MAX_SONGS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, maxSongsPerUserInQueue: opt.value }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    settings.maxSongsPerUserInQueue === opt.value
                      ? 'bg-pink-600 border-pink-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Bloquear canciones duplicadas */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CopyX className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Permitir Canciones Duplicadas
                </h4>
                <p className="text-[11px] text-slate-400">
                  Si se desactiva, nadie podrá agregar una canción que ya esté sonando o en cola.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.allowDuplicates}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, allowDuplicates: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* 5. Bloquear la cola temporalmente */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {settings.isQueueLocked ? (
                <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
              ) : (
                <Unlock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Cerrar Pedidos de la Rocola (Bloquear Cola)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Pausa temporalmente que los invitados agreguen canciones a la sala.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.isQueueLocked}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, isQueueLocked: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          {/* 6. Porcentaje de Voto para Saltar */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Porcentaje para Saltar Canción (Vote Skip)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Porcentaje de oyentes necesarios para saltar un tema.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
              {VOTE_SKIP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, voteSkipPercentage: opt.value }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    settings.voteSkipPercentage === opt.value
                      ? 'bg-pink-600 border-pink-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Modo de Sala */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/30">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Modo de Control</h4>
                <p className="text-[11px] text-slate-400">
                  ¿Quién puede controlar los botones de pausa/play/saltar?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setMode('COLLABORATIVE')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  mode === 'COLLABORATIVE'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Colaborativo</div>
                <div className="text-[10px] text-slate-400">Todos controlan el reproductor</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('DJ_ONLY')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  mode === 'DJ_ONLY'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Modo DJ (Solo Anfitrión)</div>
                <div className="text-[10px] text-slate-400">Solo tú controlas la música</div>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-purple-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Cambios</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
