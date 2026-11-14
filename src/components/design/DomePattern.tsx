import { useMemo } from 'react';

/**
 * Badge-v3 pixel field from the redesign's make_patterns.py / make_bg.py.
 * Squares are quantised in code (Dark Blue #2F3095 on Temba blue). Not an image.
 */

type Rng = { random: () => number; normal: () => number };

function makeRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  const random = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  return {
    random,
    normal() {
      const u = Math.max(random(), 1e-9);
      const v = random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
    },
  };
}

type Field = (x: number, y: number) => number;

function dome(cx: number, cy: number, R: number, bw = 22, top = 0, topY = 0): Field {
  return (x, y) => {
    const dd = Math.hypot(x - cx, y - cy);
    const band = 1.25 * Math.exp(-(((dd - R) / bw) ** 2));
    const inner = dd < R ? 0.62 - 0.55 * (((R - dd) / R) ** 0.6) : 0;
    const outer = dd > R ? 0.55 * Math.exp(-((((dd - R) / (bw * 2.4)) ** 2))) : 0;
    const t = y < topY ? top : 0;
    return Math.max(band, inner, outer, t);
  };
}

function cascade(W: number, H: number, strength = 1, x0 = 0.5): Field {
  return (x, y) => {
    const nx = x / W;
    const ny = y / H;
    return Math.max(0, Math.min(1.2, ((nx - x0) * 1.9 - ny * 0.45 + 0.3) * strength));
  };
}

function squares(W: number, H: number, cell: number, field: Field, seed: number) {
  const rng = makeRng(seed);
  const out: { x: number; y: number; w: number }[] = [];
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const gx = i * cell;
      const gy = j * cell;
      const cx = gx + cell / 2;
      const cy = gy + cell / 2;
      const v = field(cx, cy) + rng.normal() * 0.05;
      const chk = (i + j) % 2 === 0;
      const r = rng.random();
      const r2 = rng.random();
      if (v < 0.1) continue;
      let f = 0;
      if (v > 0.85) f = 1;
      else if (v > 0.66) f = chk || r < 0.35 ? 1 : 0.6;
      else if (v > 0.48) f = chk ? 0.72 : r < 0.5 ? 0.4 : 0;
      else if (v > 0.3) f = chk ? 0.45 : 0;
      else f = i % 2 === 0 && j % 2 === 0 ? 0.24 : 0;
      if (f === 0 || (f < 1 && r2 < 0.08)) continue;
      const s = cell * f;
      const g = f === 1 ? cell * 0.07 : 0;
      out.push({ x: gx + (cell - s) / 2 + g, y: gy + (cell - s) / 2 + g, w: s - 2 * g });
    }
  }
  return out;
}

export type DomeVariant =
  | 'hero'
  | 'hero-mobile'
  | 'dome'
  | 'band'
  | 'tile'
  | 'ticket-head'
  | 'ticket-ink'
  | 'ticket-grey';

const PRESETS: Record<DomeVariant, { w: number; h: number; cell: number; seed: number; color: string; field: Field }> = {
  hero: { w: 1440, h: 640, cell: 18, seed: 3, color: '#2F3095', field: cascade(1440, 640, 1, 0.42) },
  'hero-mobile': { w: 390, h: 560, cell: 13, seed: 3, color: '#2F3095', field: cascade(390, 560, 1, 0.45) },
  dome: { w: 1200, h: 420, cell: 14, seed: 11, color: '#2F3095', field: dome(600, 460, 250, 16, 0.18, 80) },
  band: { w: 1440, h: 560, cell: 16, seed: 9, color: '#2F3095', field: cascade(1440, 560, 1.1, 0.35) },
  tile: { w: 400, h: 300, cell: 12, seed: 7, color: '#2F3095', field: dome(200, 340, 160, 14, 0.15, 40) },
  'ticket-head': { w: 342, h: 220, cell: 12, seed: 5, color: '#2F3095', field: cascade(342, 220, 1, 0.4) },
  'ticket-ink': { w: 342, h: 220, cell: 12, seed: 5, color: '#3D3FE2', field: cascade(342, 220, 1, 0.4) },
  'ticket-grey': { w: 342, h: 220, cell: 12, seed: 5, color: '#3A3D55', field: cascade(342, 220, 1, 0.4) },
};

export default function DomePattern({
  variant = 'tile',
  className = '',
}: {
  variant?: DomeVariant;
  className?: string;
}) {
  const preset = PRESETS[variant];
  const rects = useMemo(
    () => squares(preset.w, preset.h, preset.cell, preset.field, preset.seed),
    [preset],
  );

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${preset.w} ${preset.h}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <g fill={preset.color}>
        {rects.map((rect, index) => (
          <rect key={index} x={rect.x} y={rect.y} width={rect.w} height={rect.w} />
        ))}
      </g>
    </svg>
  );
}
