import { useId } from 'react';
import { cn } from '../../utils/cn';

/** Burj Khalifa: stepped setbacks tapering to the spire. */
const BURJ_KHALIFA =
'440,470 440,382 447,382 447,304 455,304 455,236 461,236 461,176 466,176 466,128 469,128 471,58 473,128 476,128 476,176 481,176 481,236 487,236 487,304 495,304 495,382 502,382 502,470';

const towers: [x: number, w: number, h: number, layer: 0 | 1][] = [
[20, 46, 150, 0], [70, 34, 210, 0], [108, 40, 170, 1], [252, 38, 230, 1], [294, 30, 190, 0], [330, 44, 260, 1], [378, 36, 205, 0],
[512, 40, 245, 1], [556, 30, 300, 0], [590, 46, 215, 1], [640, 34, 275, 0], [678, 40, 190, 1], [722, 30, 240, 0], [756, 44, 170, 1]];

/** Decorative Dubai skyline at dusk (pure SVG — no external image needed). */
export function SkylineArt({ className }: {className?: string;}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMax slice" className={cn('h-full w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0B1B2E" />
          <stop offset="0.55" stopColor="#12324A" />
          <stop offset="0.85" stopColor="#0F6B6E" />
          <stop offset="1" stopColor="#D9A441" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFD98A" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#F0A548" stopOpacity="0.45" />
          <stop offset="1" stopColor="#F0A548" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-tower`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0A1626" />
          <stop offset="0.6" stopColor="#13263D" />
          <stop offset="1" stopColor="#1D3A57" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0F4F5C" />
          <stop offset="1" stopColor="#0A1626" />
        </linearGradient>
        <pattern id={`${id}-win`} width="8" height="10" patternUnits="userSpaceOnUse">
          <rect x="2" y="3" width="2.4" height="3" fill="#FFD98A" opacity="0.55" />
        </pattern>
      </defs>

      <rect width="800" height="520" fill={`url(#${id}-sky)`} />
      <circle cx="600" cy="410" r="130" fill={`url(#${id}-sun)`} />
      {[[60, 50], [150, 90], [240, 40], [360, 70], [620, 60], [700, 110], [760, 40], [520, 30]].map(([x, y]) =>
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#fff" opacity="0.6" />
      )}

      {/* distant towers */}
      {towers.filter(([, , , l]) => l === 0).map(([x, w, h]) =>
      <rect key={x} x={x} y={470 - h} width={w} height={h} fill="#1A3550" opacity="0.75" />
      )}

      {/* Burj Al Arab sail */}
      <path d="M165 470 L165 262 Q166 214 196 190 Q244 252 246 470 Z" fill={`url(#${id}-tower)`} />
      <path d="M165 262 Q166 214 196 190" stroke="#9FD8D4" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <line x1="164" y1="470" x2="164" y2="170" stroke="#2A4363" strokeWidth="3" />

      {/* near towers with lit windows */}
      {towers.filter(([, , , l]) => l === 1).map(([x, w, h]) =>
      <g key={x}>
          <rect x={x} y={470 - h} width={w} height={h} fill={`url(#${id}-tower)`} />
          <rect x={x + 3} y={480 - h} width={w - 6} height={h - 20} fill={`url(#${id}-win)`} />
        </g>
      )}

      {/* Burj Khalifa */}
      <polygon points={BURJ_KHALIFA} fill={`url(#${id}-tower)`} />
      <polygon points={BURJ_KHALIFA} fill={`url(#${id}-win)`} opacity="0.6" />
      <line x1="471" y1="58" x2="471" y2="470" stroke="#9FD8D4" strokeOpacity="0.25" />

      {/* creek / water */}
      <rect y="470" width="800" height="50" fill={`url(#${id}-water)`} />
      {[480, 490, 500, 510].map((y, i) =>
      <line key={y} x1={80 + i * 40} y1={y} x2={720 - i * 50} y2={y} stroke="#9FD8D4" strokeOpacity={0.18 - i * 0.03} />
      )}
      <rect x="560" y="474" width="80" height="3" rx="1.5" fill="#FFD98A" opacity="0.35" />
    </svg>);

}
