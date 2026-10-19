import React, { useState } from 'react';
import type { Song, User, RoomMode, RoomSettings } from '@mirocola/shared';
import {
  Music,
  Trash2,
  Plus,
  Flame,
  Lock,
  Clock,
  History,
  RotateCcw,
  Check,
  Loader2
} from 'lucide-react';
import { formatTime } from '../lib/utils';

interface SongQueueProps {
  queue: Song[];
  history?: Song[];
  currentUser: User | null;
  roomMode: RoomMode;
  roomSettings?: RoomSettings;
  isHost: boolean;
  onUpvote: (songId: string) => void;
  onRemove: (songId: string) => void;
  onOpenAddModal: () => void;
  onAddSong?: (url: string) => Promise<{ success: boolean; error?: string }>;
}

export const SongQueue: React.FC<SongQueueProps> = ({
  queue,
  history = [],
  currentUser,
  roomMode,
  roomSettings,
  isHost,
  onUpvote,
  onRemove,
  onOpenAddModal,
  onAddSong
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [requeuingId, setRequeuingId] = useState<string | null>(null);
  const [requeuedSuccessId, setRequeuedSuccessId] = useState<string | null>(null);
  const [requeueError, setRequeueError] = useState<string | null>(null);

  const isLocked = roomSettings?.isQueueLocked ?? false;

  const handleRequeue = async (song: Song) => {
    if (!onAddSong) return;
    setRequeuingId(song.id);
    setRequeueError(null);
    try {
      const res = await onAddSong(song.url);
      if (res.success) {
        setRequeuedSuccessId(song.id);
        setTimeout(() => setRequeuedSuccessId(null), 2500);
      } else {
        setRequeueError(res.error || 'No se pudo reencolar la canción');
        setTimeout(() => setRequeueError(null), 3500);
      }
    } catch {
      setRequeueError('Error al volver a pedir la canción');
      setTimeout(() => setRequeueError(null), 3500);
    } finally {
      setRequeuingId(null);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-purple-900/40 rounded-2xl p-3.5 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col h-full min-h-[440px]">
      {/* Top Header & Tab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-900/30 mb-3 gap-2 flex-wrap">
        {/* Navigation Tabs: En cola vs Ya sonaron */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-purple-900/40">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Por Sonar</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'queue'
                  ? 'bg-black/30 text-white'
                  : 'bg-purple-950 text-purple-300'
              }`}
            >
              {queue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ya Sonaron</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'history'
                  ? 'bg-black/30 text-white'
                  : 'bg-purple-950 text-purple-300'
              }`}
            >
              {history.length}
            </span>
          </button>
        </div>

        {/* Action button: Pedir Canción */}
        {activeTab === 'queue' && (
          <button
            onClick={onOpenAddModal}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all ${
              isLocked
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white shadow-purple-600/25 cursor-pointer active:scale-95'
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Cerrada</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Pedir Tema</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Rules notice when in Queue tab */}
      {activeTab === 'queue' && roomSettings && (
        <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-purple-950/30 border border-purple-900/30 flex items-center justify-between text-[10px] text-purple-300">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            {roomSettings.maxSongDurationSeconds > 0 && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3 text-pink-400" />
                Máx {Math.floor(roomSettings.maxSongDurationSeconds / 60)}m
              </span>
            )}
            {roomSettings.maxSongsPerUserInQueue > 0 && (
              <span className="flex items-center gap-1 flex-shrink-0">
                • Máx {roomSettings.maxSongsPerUserInQueue} temas/usuario
              </span>
            )}
            {roomSettings.preventConsecutiveUserSongs && (
              <span className="flex items-center gap-1 flex-shrink-0">
                • Sin temas consecutivos
              </span>
            )}
          </div>
          {isLocked && (
            <span className="text-red-400 font-bold flex items-center gap-1 flex-shrink-0 pl-1">
              <Lock className="w-3 h-3" /> Cerrada
            </span>
          )}
        </div>
      )}

      {/* Requeue Error Alert */}
      {requeueError && (
        <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-700/60 text-xs text-red-300 animate-fade-in flex items-center gap-2">
          <span>⚠️ {requeueError}</span>
        </div>
      )}

      {/* TAB 1: POR SONAR (QUEUE) */}
      {activeTab === 'queue' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {queue.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-purple-900/40 rounded-xl bg-purple-950/10">
              <Music className="w-8 h-8 text-purple-400/50 mb-2" />
              <p className="text-sm font-medium text-slate-300">La cola está vacía</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {isLocked
                  ? 'El anfitrión ha cerrado temporalmente los pedidos de la rocola.'
                  : '¡Pide una canción ahora para que la música no se detenga!'}
              </p>
              {!isLocked && (
                <button
                  onClick={onOpenAddModal}
                  className="mt-3 text-xs text-pink-400 hover:text-pink-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Agregar canción
                </button>
              )}
            </div>
          ) : (
            queue.map((song, index) => {
              const hasUpvoted = currentUser ? song.upvotes.includes(currentUser.id) : false;
              const canDelete =
                isHost ||
                roomMode === 'COLLABORATIVE' ||
                (currentUser && song.addedBy.id === currentUser.id);

              return (
                <div
                  key={song.id}
                  className="group flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-purple-900/20 hover:border-purple-800/60 transition-all"
                >
                  {/* Index badge */}
                  <span className="w-5 text-center text-xs font-mono font-bold text-slate-500">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                    {song.durationSeconds > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                        {formatTime(song.durationSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-100 truncate group-hover:text-pink-300 transition-colors">
                      {song.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="truncate max-w-[110px] sm:max-w-[140px]">
                        {song.channelTitle}
                      </span>
                      <span>•</span>
                      <span className="text-purple-400 text-[10px]">Por: {song.addedBy.name}</span>
                    </div>
                  </div>

                  {/* Actions: Upvote & Remove */}
                  <div className="flex items-center gap-1.5">
                    {/* Upvote Button */}
                    <button
                      onClick={() => onUpvote(song.id)}
                      title={hasUpvoted ? 'Quitar voto' : 'Votar para que suene antes'}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                        hasUpvoted
                          ? 'bg-pink-950/60 border-pink-700/80 text-pink-300 shadow-sm shadow-pink-500/20'
                          : 'bg-slate-900/80 border-slate-800 hover:border-purple-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Flame
                        className={`w-3.5 h-3.5 ${
                          hasUpvoted ? 'text-pink-400 fill-pink-400 animate-pulse' : ''
                        }`}
                      />
                      <span>{song.upvotes.length}</span>
                    </button>

                    {/* Remove Button */}
                    {canDelete && (
                      <button
                        onClick={() => onRemove(song.id)}
                        title="Eliminar de la cola"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: YA SONARON (HISTORIAL) */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {history.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-purple-900/40 rounded-xl bg-purple-950/10">
              <History className="w-8 h-8 text-purple-400/50 mb-2" />
              <p className="text-sm font-medium text-slate-300">Sin historial aún</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Las canciones que ya se hayan reproducido o saltado aparecerán aquí registradas.
              </p>
            </div>
          ) : (
            history.map((song, index) => {
              const isRequeuing = requeuingId === song.id;
              const isRequeued = requeuedSuccessId === song.id;

              return (
                <div
                  key={`${song.id}-${index}`}
                  className="group flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 border border-purple-900/20 hover:border-purple-800/40 transition-all opacity-90 hover:opacity-100"
                >
                  {/* History index */}
                  <span className="w-5 text-center text-xs font-mono text-slate-500">
                    #{index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 grayscale-[30%] group-hover:grayscale-0 transition-all">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                    {song.durationSeconds > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                        {formatTime(song.durationSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-slate-200 truncate group-hover:text-pink-300 transition-colors">
                      {song.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="truncate max-w-[110px] sm:max-w-[140px]">
                        {song.channelTitle}
                      </span>
                      <span>•</span>
                      <span className="text-purple-400 text-[10px]">
                        Pedida por: {song.addedBy.name}
                      </span>
                    </div>
                  </div>

                  {/* Re-queue action */}
                  {onAddSong && (
                    <button
                      onClick={() => handleRequeue(song)}
                      disabled={isLocked || isRequeuing}
                      title="Volver a pedir esta canción para que suene de nuevo"
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isRequeued
                          ? 'bg-emerald-950/80 border border-emerald-600/70 text-emerald-300'
                          : isLocked
                          ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800'
                          : 'bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 hover:border-pink-500/50 text-purple-200 hover:text-white'
                      }`}
                    >
                      {isRequeuing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                          <span className="hidden sm:inline text-[11px]">Encolando...</span>
                        </>
                      ) : isRequeued ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="hidden sm:inline text-[11px]">¡Agregada!</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3 text-pink-400" />
                          <span className="hidden sm:inline text-[11px]">Pedir otra vez</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
