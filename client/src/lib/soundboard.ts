import type { SoundEffectId } from '@mirocola/shared';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export interface SoundMeta {
  id: SoundEffectId;
  name: string;
  emoji: string;
  label: string;
  color: string;
}

export const SOUND_EFFECTS: SoundMeta[] = [
  {
    id: 'airhorn',
    name: 'Bocina DJ',
    emoji: '🎺',
    label: 'Airhorn',
    color: 'from-amber-500 to-red-500'
  },
  {
    id: 'drop',
    name: 'Bass Drop',
    emoji: '💥',
    label: 'Drop Boom',
    color: 'from-rose-600 to-purple-800'
  },
  {
    id: 'applause',
    name: 'Aplausos',
    emoji: '👏',
    label: 'Ovación',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'scratch',
    name: 'Scratch',
    emoji: '🎚️',
    label: 'Vinilo',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'siren',
    name: 'Sirena',
    emoji: '🚨',
    label: 'Sirena',
    color: 'from-red-500 to-rose-600'
  },
  {
    id: 'laser',
    name: 'Láser EDM',
    emoji: '🚀',
    label: 'Láser',
    color: 'from-cyan-400 to-blue-600'
  },
  {
    id: 'bell',
    name: 'Campana Ring',
    emoji: '🔔',
    label: 'Campana',
    color: 'from-yellow-400 to-amber-600'
  },
  {
    id: 'rewind',
    name: 'Rewind DJ',
    emoji: '⏪',
    label: 'Rewind',
    color: 'from-fuchsia-500 to-indigo-600'
  },
  {
    id: 'cheer',
    name: 'Silbato Fiesta',
    emoji: '🎉',
    label: 'Fiesta',
    color: 'from-green-400 to-emerald-600'
  },
  {
    id: 'badumtss',
    name: 'Ba-Dum-Tss',
    emoji: '🥁',
    label: 'Remate',
    color: 'from-blue-500 to-indigo-600'
  }
];

/**
 * Play synthesized high-energy DJ sound effects via Web Audio API
 */
export function playSoundEffect(soundId: SoundEffectId) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (soundId) {
      case 'airhorn':
        playAirhorn(ctx, now);
        break;
      case 'drop':
        playBassDrop(ctx, now);
        break;
      case 'applause':
        playApplause(ctx, now);
        break;
      case 'scratch':
        playScratch(ctx, now);
        break;
      case 'siren':
        playSiren(ctx, now);
        break;
      case 'laser':
        playLaser(ctx, now);
        break;
      case 'bell':
        playBell(ctx, now);
        break;
      case 'rewind':
        playRewind(ctx, now);
        break;
      case 'cheer':
        playCheer(ctx, now);
        break;
      case 'badumtss':
        playBadumtss(ctx, now);
        break;
    }
  } catch (err) {
    console.warn('[Soundboard] Audio playback error:', err);
  }
}

// 1. Classic Dancehall Airhorn blast: Ta-Ta-Taaaa!
function playAirhorn(ctx: AudioContext, start: number) {
  const bursts = [
    { offset: 0, duration: 0.12 },
    { offset: 0.16, duration: 0.12 },
    { offset: 0.32, duration: 0.45 }
  ];

  const frequencies = [466.16, 587.33, 698.46]; // Bb4, D5, F5 major chord

  bursts.forEach(({ offset, duration }) => {
    const t = start + offset;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gainNode.gain.setValueAtTime(0.3, t + duration - 0.03);
    gainNode.gain.linearRampToValueAtTime(0, t + duration);
    gainNode.connect(ctx.destination);

    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(gainNode);
      osc.start(t);
      osc.stop(t + duration);
    });
  });
}

// 2. Crowd Applause: Bandpassed noise with clapping spikes
function playApplause(ctx: AudioContext, start: number) {
  const duration = 1.8;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // White noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, start);
  filter.Q.setValueAtTime(1.5, start);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.2);
  gain.gain.setValueAtTime(0.25, start + 1.2);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(start);
  noise.stop(start + duration);
}

// 3. Vinyl Scratch: Frequency sweep with bandpass resonance
function playScratch(ctx: AudioContext, start: number) {
  const duration = 0.35;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';

  // Pitch sweep down then back up
  osc.frequency.setValueAtTime(1600, start);
  osc.frequency.exponentialRampToValueAtTime(250, start + 0.15);
  osc.frequency.exponentialRampToValueAtTime(800, start + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, start);
  filter.Q.setValueAtTime(3.0, start);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, start);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration);
}

// 4. Rave Siren: LFO modulated siren pitch
function playSiren(ctx: AudioContext, start: number) {
  const duration = 1.4;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';

  // Siren pitch oscillation
  osc.frequency.setValueAtTime(500, start);
  osc.frequency.linearRampToValueAtTime(950, start + 0.35);
  osc.frequency.linearRampToValueAtTime(500, start + 0.7);
  osc.frequency.linearRampToValueAtTime(950, start + 1.05);
  osc.frequency.linearRampToValueAtTime(500, start + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
  gain.gain.setValueAtTime(0.25, start + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration);
}

// 5. Ba-Dum-Tss Joke Rimshot
function playBadumtss(ctx: AudioContext, start: number) {
  // First hit (Ba)
  playTom(ctx, start, 160);
  // Second hit (Dum)
  playTom(ctx, start + 0.18, 120);
  // Cymbal splash (Tss)
  playCymbal(ctx, start + 0.38);
}

function playTom(ctx: AudioContext, time: number, freq: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(50, time + 0.15);

  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.15);
}

function playCymbal(ctx: AudioContext, time: number) {
  const bufferSize = ctx.sampleRate * 0.6;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(5000, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(time);
  noise.stop(time + 0.6);
}

// 6. Bass Drop 808 Boom
function playBassDrop(ctx: AudioContext, start: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, start);
  osc.frequency.exponentialRampToValueAtTime(32, start + 0.8);

  gain.gain.setValueAtTime(0.8, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + 0.9);
}

// 7. EDM Laser Pew-Pew
function playLaser(ctx: AudioContext, start: number) {
  const shots = [0, 0.12, 0.24];
  shots.forEach((offset) => {
    const t = start + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  });
}

// 8. Boxing Ring Bell (Ding-Ding-Ding)
function playBell(ctx: AudioContext, start: number) {
  const rings = [0, 0.2, 0.4];
  rings.forEach((offset) => {
    const t = start + offset;
    [1046.5, 2093].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  });
}

// 9. DJ Vinyl Rewind / Tape Stop
function playRewind(ctx: AudioContext, start: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, start);
  osc.frequency.exponentialRampToValueAtTime(1600, start + 0.35);

  gain.gain.setValueAtTime(0.35, start);
  gain.gain.linearRampToValueAtTime(0.4, start + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + 0.4);
}

// 10. Fiesta Whistle / Celebration Cheer
function playCheer(ctx: AudioContext, start: number) {
  const bursts = [0, 0.15, 0.3];
  bursts.forEach((offset, idx) => {
    const t = start + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = idx === 1 ? 1600 : 1300;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq + 300, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  });
}
