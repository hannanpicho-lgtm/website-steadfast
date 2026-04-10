import { useCallback, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
  shape: 'square' | 'circle' | 'strip';
}

const CONFETTI_COLORS = [
  '#00D9FF', // cyan accent
  '#c8956c', // warm gold
  '#9b7fb8', // purple
  '#6a9e7e', // green
  '#d4935a', // orange
  '#FF6B8A', // pink
  '#FFD700', // gold
  '#7a8db8', // blue
];

const CELEBRATION_COLORS = [
  '#FFD700', '#FF6B00', '#FF3D00', '#c8956c', '#00D9FF',
];

interface ConfettiOptions {
  /** Number of particles. Default: 80 */
  count?: number;
  /** Spread angle in degrees. Default: 70 */
  spread?: number;
  /** Origin point (0-1). Default: { x: 0.5, y: 0.5 } */
  origin?: { x: number; y: number };
  /** Custom colors array */
  colors?: string[];
  /** Duration in ms. Default: 2500 */
  duration?: number;
  /** Gravity. Default: 0.4 */
  gravity?: number;
}

function createParticle(
  canvasWidth: number,
  canvasHeight: number,
  options: Required<ConfettiOptions>
): Particle {
  const { origin, spread, colors, gravity, duration } = options;
  const angle = ((-90 + (Math.random() - 0.5) * spread * 2) * Math.PI) / 180;
  const velocity = 8 + Math.random() * 8;
  const shapes: Particle['shape'][] = ['square', 'circle', 'strip'];

  return {
    x: canvasWidth * origin.x,
    y: canvasHeight * origin.y,
    vx: Math.cos(angle) * velocity * (0.8 + Math.random() * 0.4),
    vy: Math.sin(angle) * velocity * (0.8 + Math.random() * 0.4),
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity: 1,
    life: 0,
    maxLife: duration / 16, // ~frames
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.fillStyle = p.color;

  switch (p.shape) {
    case 'square':
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'strip':
      ctx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 2);
      break;
  }
  ctx.restore();
}

/**
 * Lightweight canvas-based confetti/celebration effect.
 * Runs entirely off the main thread layout — only paints on a GPU-composited canvas.
 *
 * Usage:
 *   const { fire, fireCelebration } = useConfetti();
 *   <button onClick={() => fire()}>🎉</button>
 */
export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef(0);

  const ensureCanvas = useCallback(() => {
    if (canvasRef.current) return canvasRef.current;

    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    return canvas;
  }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animIdRef.current);
    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }
  }, []);

  const fire = useCallback(
    (opts: ConfettiOptions = {}) => {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const resolved: Required<ConfettiOptions> = {
        count: opts.count ?? 80,
        spread: opts.spread ?? 70,
        origin: opts.origin ?? { x: 0.5, y: 0.5 },
        colors: opts.colors ?? CONFETTI_COLORS,
        duration: opts.duration ?? 2500,
        gravity: opts.gravity ?? 0.4,
      };

      const canvas = ensureCanvas();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles: Particle[] = [];
      for (let i = 0; i < resolved.count; i++) {
        particles.push(createParticle(canvas.width, canvas.height, resolved));
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let alive = false;
        for (const p of particles) {
          p.life++;
          if (p.life > p.maxLife) continue;

          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += resolved.gravity;
          p.vx *= 0.99;
          p.rotation += p.rotationSpeed;

          // Fade out in the last 30% of life
          const lifeRatio = p.life / p.maxLife;
          p.opacity = lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1;

          drawParticle(ctx, p);
        }

        if (alive) {
          animIdRef.current = requestAnimationFrame(animate);
        } else {
          cleanup();
        }
      };

      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = requestAnimationFrame(animate);
    },
    [ensureCanvas, cleanup]
  );

  /** Preset: celebration burst from bottom center */
  const fireCelebration = useCallback(
    () =>
      fire({
        count: 120,
        spread: 90,
        origin: { x: 0.5, y: 0.85 },
        colors: CELEBRATION_COLORS,
        duration: 3000,
        gravity: 0.35,
      }),
    [fire]
  );

  /** Preset: subtle side burst (e.g., successful action) */
  const fireSuccess = useCallback(
    () =>
      fire({
        count: 40,
        spread: 50,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#6a9e7e', '#88c0a0', '#00D9FF', '#c8956c'],
        duration: 2000,
        gravity: 0.3,
      }),
    [fire]
  );

  return { fire, fireCelebration, fireSuccess };
}
