import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { SoundEffectId } from '@mirocola/shared';
import { SOUND_EFFECTS, playSoundEffect } from '../lib/soundboard';

interface SoundboardProps {
  onTriggerSound: (soundId: SoundEffectId) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const Soundboard: React.FC<SoundboardProps> = ({
  onTriggerSound,
  isMuted = false,
  onToggleMute
}) => {
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const handleClick = (soundId: SoundEffectId) => {
    setActiveSound(soundId);
    setTimeout(() => setActiveSound(null), 600);

    // Play locally if not muted
    if (!isMuted) {
      playSoundEffect(soundId);
    }
    // Broadcast to room
    onTriggerSound(soundId);
  };

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-purple-900/40 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-purple-900/20">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Soundboard DJ & Efectos</span>
        </div>

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-950/60 border border-purple-900/20 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3 h-3 text-red-400" />
                <span className="text-red-300">Efectos Mute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>Efectos ON</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Sound Buttons Grid: 10 effects compact layout */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1.5">
        {SOUND_EFFECTS.map((sound) => {
          const isActive = activeSound === sound.id;
          return (
            <button
              key={sound.id}
              onClick={() => handleClick(sound.id)}
              title={`Efecto DJ: ${sound.name}`}
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-tr ' + sound.color + ' border-white text-white scale-105 shadow-lg z-10'
                  : 'bg-slate-950/70 border-purple-900/30 hover:border-purple-600/60 text-slate-200 hover:bg-slate-900/80 hover:text-white'
              }`}
            >
              <span className="text-base sm:text-lg leading-tight mb-0.5">{sound.emoji}</span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">
                {sound.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
