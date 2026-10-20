export interface DjRank {
  name: string;
  emoji: string;
  minPoints: number;
  nextPoints: number | null;
  badgeClass: string;
  description: string;
}

export function getDjRank(score: number): DjRank {
  if (score >= 2000) {
    return {
      name: 'DJ Leyenda',
      emoji: '⭐',
      minPoints: 2000,
      nextPoints: null,
      badgeClass: 'from-amber-400 via-pink-500 to-purple-500 text-white border-amber-300/50',
      description: '¡El amo de la fiesta y los mejores temazos!'
    };
  }

  if (score >= 500) {
    return {
      name: 'DJ Residente',
      emoji: '🎛️',
      minPoints: 500,
      nextPoints: 2000,
      badgeClass: 'from-purple-500 to-pink-500 text-white border-purple-400/50',
      description: 'Conoce los gustos de la sala y hace vibrar la rocola.'
    };
  }

  if (score >= 100) {
    return {
      name: 'Melómano',
      emoji: '🎵',
      minPoints: 100,
      nextPoints: 500,
      badgeClass: 'from-cyan-500 to-blue-600 text-white border-cyan-400/50',
      description: 'Pide buenas canciones y acumula aplausos.'
    };
  }

  return {
    name: 'Oyente Curioso',
    emoji: '🎧',
    minPoints: 0,
    nextPoints: 100,
    badgeClass: 'from-slate-700 to-purple-900 text-slate-200 border-slate-700',
    description: 'Comenzando su viaje musical en MiRocola.'
  };
}
