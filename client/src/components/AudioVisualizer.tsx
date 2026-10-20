import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  colorScheme?: 'neon' | 'cyberpunk' | 'retro' | 'synthwave';
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barCount = 36,
  colorScheme = 'neon',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    // Array of heights for smooth interpolation
    const barHeights = new Array(barCount).fill(10);
    const targetHeights = new Array(barCount).fill(10);

    const getColors = () => {
      switch (colorScheme) {
        case 'cyberpunk':
          return { from: '#06b6d4', to: '#eab308' };
        case 'retro':
          return { from: '#f97316', to: '#ef4444' };
        case 'synthwave':
          return { from: '#8b5cf6', to: '#ec4899' };
        case 'neon':
        default:
          return { from: '#ec4899', to: '#a855f7' };
      }
    };

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += 0.08;

      // Update target heights based on music play state
      for (let i = 0; i < barCount; i++) {
        if (isPlaying) {
          // Dynamic rhythm generation using sin/cos harmonics
          const wave1 = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 1.5 + i * 0.5) * 0.3 + 0.5;
          const bassBoost = i < barCount * 0.3 ? 1.3 : 0.8;
          const randomJitter = Math.random() * 0.25;

          const energy = Math.min(1, (wave1 * 0.6 + wave2 * 0.4 + randomJitter) * bassBoost);
          targetHeights[i] = Math.max(8, energy * (height * 0.85));
        } else {
          // Gentle resting ripple when paused
          targetHeights[i] = 8 + Math.sin(phase * 0.5 + i * 0.4) * 4;
        }

        // Smooth interpolation
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.2;
      }

      const totalSpacing = width / barCount;
      const barWidth = Math.max(3, totalSpacing * 0.65);
      const gap = totalSpacing - barWidth;

      const { from, to } = getColors();

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap) + gap / 2;
        const bHeight = barHeights[i];
        const y = height - bHeight;

        // Gradient for each bar
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, from);
        grad.addColorStop(1, to);

        ctx.fillStyle = grad;

        // Rounded top bars
        const radius = Math.min(barWidth / 2, 4);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Neon Glow cap
        if (isPlaying && bHeight > 25) {
          ctx.shadowColor = to;
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 2, barWidth, 2);
          ctx.shadowBlur = 0;
        }
      }

      animationId = requestAnimationFrame(render);
    };

    // Resize canvas to match display size
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width * window.devicePixelRatio;
          canvas.height = height * window.devicePixelRatio;
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    });

    resizeObserver.observe(canvas);
    render();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [isPlaying, barCount, colorScheme]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
