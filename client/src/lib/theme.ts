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
  accentColor: string;
  glow1: string;
  glow2: string;
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
    borderAccent: 'rgba(168, 85, 247, 0.4)',
    accentColor: '#ec4899',
    glow1: 'rgba(168, 85, 247, 0.35)',
    glow2: 'rgba(236, 72, 153, 0.25)',
    bgDark: '#030712',
    cardBg: 'rgba(15, 23, 42, 0.85)',
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
    borderAccent: 'rgba(245, 158, 11, 0.4)',
    accentColor: '#f59e0b',
    glow1: 'rgba(245, 158, 11, 0.4)',
    glow2: 'rgba(234, 88, 12, 0.3)',
    bgDark: '#0f0a04',
    cardBg: 'rgba(26, 18, 9, 0.85)',
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
    borderAccent: 'rgba(16, 185, 129, 0.4)',
    accentColor: '#10b981',
    glow1: 'rgba(16, 185, 129, 0.45)',
    glow2: 'rgba(20, 184, 166, 0.35)',
    bgDark: '#02140d',
    cardBg: 'rgba(6, 28, 20, 0.85)',
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
    borderAccent: 'rgba(6, 182, 212, 0.4)',
    accentColor: '#06b6d4',
    glow1: 'rgba(6, 182, 212, 0.4)',
    glow2: 'rgba(59, 130, 246, 0.3)',
    bgDark: '#030816',
    cardBg: 'rgba(8, 18, 38, 0.85)',
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
    borderAccent: 'rgba(244, 63, 94, 0.4)',
    accentColor: '#f43f5e',
    glow1: 'rgba(244, 63, 94, 0.45)',
    glow2: 'rgba(249, 115, 22, 0.35)',
    bgDark: '#140409',
    cardBg: 'rgba(32, 10, 16, 0.85)',
    accentText: 'text-rose-400'
  }
};
