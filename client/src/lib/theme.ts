import type { RoomTheme } from '@mirocola/shared';

export interface ThemeConfig {
  id: RoomTheme;
  name: string;
  emoji: string;
  description: string;
  previewGradient: string;
  btnGradient: string;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
  glowColor: string;
  bgDark: string;
  cardBg: string;
  accentText: string;
}

export const THEMES: Record<RoomTheme, ThemeConfig> = {
  neon: {
    id: 'neon',
    name: 'Cyber Neon',
    emoji: '🔮',
    description: 'Violeta eléctrico, magenta y rosas neón estilo club cyberpunk.',
    previewGradient: 'from-purple-600 via-pink-600 to-indigo-600',
    btnGradient: 'from-purple-600 via-pink-600 to-indigo-600',
    badgeBg: 'bg-purple-950/80',
    badgeText: 'text-pink-300',
    borderAccent: 'border-purple-800/50',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    bgDark: 'bg-slate-950',
    cardBg: 'bg-slate-900/80',
    accentText: 'text-pink-400'
  },
  retro: {
    id: 'retro',
    name: 'Rocola 80s Gold',
    emoji: '📻',
    description: 'Ámbar cálido, dorados vintage y luces clásicas de rocola de bar.',
    previewGradient: 'from-amber-600 via-yellow-500 to-orange-600',
    btnGradient: 'from-amber-600 via-yellow-600 to-orange-600',
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-300',
    borderAccent: 'border-amber-800/50',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    bgDark: 'bg-[#0f0c08]',
    cardBg: 'bg-[#1a140d]/80',
    accentText: 'text-amber-400'
  },
  emerald: {
    id: 'emerald',
    name: 'Club Esmeralda',
    emoji: '🌿',
    description: 'Verde menta neón, esmeralda y turquesa estilo lounge moderno.',
    previewGradient: 'from-emerald-600 via-teal-500 to-cyan-600',
    btnGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    badgeBg: 'bg-emerald-950/80',
    badgeText: 'text-emerald-300',
    borderAccent: 'border-emerald-800/50',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    bgDark: 'bg-[#06120e]',
    cardBg: 'bg-[#091a14]/80',
    accentText: 'text-emerald-400'
  },
  midnight: {
    id: 'midnight',
    name: 'Medianoche Océano',
    emoji: '🌌',
    description: 'Azul zafiro profundo, índigo y cian eléctrico.',
    previewGradient: 'from-blue-600 via-indigo-500 to-cyan-500',
    btnGradient: 'from-blue-600 via-indigo-600 to-cyan-600',
    badgeBg: 'bg-blue-950/80',
    badgeText: 'text-cyan-300',
    borderAccent: 'border-blue-800/50',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    bgDark: 'bg-[#060a14]',
    cardBg: 'bg-[#0a1122]/80',
    accentText: 'text-cyan-400'
  },
  sunset: {
    id: 'sunset',
    name: 'Atardecer Fiesta',
    emoji: '🌅',
    description: 'Naranja fuego, fucsia intenso y rojo atardecer tropical.',
    previewGradient: 'from-orange-600 via-rose-600 to-red-600',
    btnGradient: 'from-orange-600 via-rose-600 to-red-600',
    badgeBg: 'bg-rose-950/80',
    badgeText: 'text-rose-300',
    borderAccent: 'border-rose-800/50',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    bgDark: 'bg-[#13070a]',
    cardBg: 'bg-[#1e0d12]/80',
    accentText: 'text-rose-400'
  }
};
