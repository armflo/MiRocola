import React, { useEffect, useState, useRef } from 'react';
import { Mic2, X, Music, Loader2, Sparkles } from 'lucide-react';
import { LyricsService, type LyricLine, type LyricsResult } from '../services/lyricsService';
import { AudioVisualizer } from './AudioVisualizer';

interface KaraokeLyricsProps {
  title: string;
  channelTitle: string;
  durationSeconds?: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  onClose?: () => void;
  isTvMode?: boolean;
}

export const KaraokeLyrics: React.FC<KaraokeLyricsProps> = ({
  title,
  channelTitle,
  durationSeconds,
  currentTime,
  isPlaying,
  onSeek,
  onClose,
  isTvMode = false
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLineIdx, setActiveLineIdx] = useState<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics when song changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLyricsData(null);
    setActiveLineIdx(-1);

    LyricsService.getLyrics(title, channelTitle, durationSeconds)
      .then((res) => {
        if (!isCancelled) {
          setLyricsData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load lyrics:', err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [title, channelTitle, durationSeconds]);

  // Update active line based on currentTime
  useEffect(() => {
    if (!lyricsData?.syncedLyrics || lyricsData.syncedLyrics.length === 0) return;

    const lines = lyricsData.syncedLyrics;
    let currentIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        currentIdx = i;
      } else {
        break;
      }
    }

    if (currentIdx !== activeLineIdx) {
      setActiveLineIdx(currentIdx);
    }
  }, [currentTime, lyricsData, activeLineIdx]);

  // Smooth auto-scroll active line into center
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLineIdx]);

  return (
    <div
      className={`relative flex flex-col h-full w-full rounded-2xl bg-slate-950/90 border border-purple-800/40 backdrop-blur-xl overflow-hidden shadow-2xl ${
        isTvMode ? 'p-6' : 'p-4'
      }`}
    >
      {/* Ambient background visualizer bar */}
      <div className="absolute inset-x-0 bottom-0 h-28 opacity-25 pointer-events-none z-0">
        <AudioVisualizer isPlaying={isPlaying} barCount={48} colorScheme="synthwave" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-purple-900/40 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30">
            <Mic2 className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate">
                Modo Karaoke & Letras
              </h3>
              {lyricsData?.syncedLyrics && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Sincronizado
                </span>
              )}
            </div>
            <p className="text-xs text-purple-300 truncate">
              {lyricsData?.trackName || title} — {lyricsData?.artistName || channelTitle}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-2 py-4 space-y-4 text-center select-none scrollbar-thin scrollbar-thumb-purple-900"
      >
        {isLoading && (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-purple-300">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            <p className="text-sm font-medium animate-pulse">
              Buscando letra sincronizada...
            </p>
          </div>
        )}

        {!isLoading && lyricsData?.syncedLyrics && (
          <div className="space-y-4 py-8">
            {lyricsData.syncedLyrics.map((line: LyricLine, idx: number) => {
              const isActive = idx === activeLineIdx;
              const isPast = idx < activeLineIdx;
              const isNext = idx === activeLineIdx + 1;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek && onSeek(line.time)}
                  className={`transition-all duration-300 px-4 py-2 rounded-xl cursor-pointer ${
                    isActive
                      ? 'scale-105 bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-pink-500/50 shadow-lg shadow-pink-500/20 font-extrabold text-white text-lg sm:text-xl md:text-2xl'
                      : isPast
                      ? 'text-slate-500 text-sm sm:text-base opacity-40 hover:opacity-80'
                      : isNext
                      ? 'text-pink-200 text-base sm:text-lg opacity-85 hover:text-white'
                      : 'text-slate-400 text-sm sm:text-base opacity-50 hover:opacity-90'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {isActive && <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />}
                    {line.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !lyricsData?.syncedLyrics && lyricsData?.plainLyrics && (
          <div className="py-4 px-2 space-y-2 text-slate-300 whitespace-pre-line text-sm sm:text-base leading-relaxed">
            <p className="text-xs font-semibold text-pink-400 mb-3 uppercase tracking-wider">
              Letra sin sincronización automática:
            </p>
            {lyricsData.plainLyrics}
          </div>
        )}

        {!isLoading && !lyricsData?.syncedLyrics && !lyricsData?.plainLyrics && (
          <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <Music className="w-10 h-10 text-purple-400 opacity-60" />
            <h4 className="text-sm font-bold text-white">
              No encontramos la letra para esta canción
            </h4>
            <p className="text-xs max-w-sm text-slate-400">
              Es posible que sea un remix exclusivo, instrumental o una versión en vivo. ¡Disfruta el ritmo y canta a tu manera!
            </p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {lyricsData?.syncedLyrics && onSeek && (
        <div className="relative z-10 pt-2 text-center text-[11px] text-purple-400/80 border-t border-purple-900/30">
          💡 Haz clic en cualquier verso para saltar directamente a ese momento
        </div>
      )}
    </div>
  );
};
