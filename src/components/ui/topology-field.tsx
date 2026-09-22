import { useEffect, useRef } from 'react';

type EffectMode = 'light' | 'dark';

export type TopologyFieldProps = {
  mode?: EffectMode;
  className?: string;
};

type Node = { x: number; y: number; z: number; pulse: number; speed: number };

function fibSphere(count: number): Node[] {
  const nodes: Node[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    nodes.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      pulse: Math.random() * Math.PI * 2,
      speed: 0.018 + Math.random() * 0.02,
    });
  }
  return nodes;
}

export default function TopologyField({ className, mode = 'dark' }: TopologyFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = fibSphere(96);
    const links: [number, number][] = [];
    const threshold = 0.42;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (dx * dx + dy * dy + dz * dz < threshold * threshold) links.push([i, j]);
      }
    }

    let raf = 0;
    let time = 0;
    let rotY = 0.4;
    let rotX = 0.22;

    const draw = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || canvas.clientWidth;
      const h = parent?.clientHeight || canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (!reduce) {
        time += 1;
        rotY += 0.0032;
        rotX = 0.2 + Math.sin(time * 0.004) * 0.04;
      }

      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const radius = Math.min(h * 0.32, w * 0.15, 140);
      const originX = w * 0.82;
      const originY = h * 0.48;
      const projected = nodes.map((n) => {
        let x = n.x * cy - n.z * sy;
        let z = n.x * sy + n.z * cy;
        const y = n.y * cx - z * sx;
        z = n.y * sx + z * cx;
        const pulse = reduce ? 0.55 : (Math.sin(time * n.speed + n.pulse) + 1) / 2;
        return { x: originX + x * radius, y: originY + y * radius, z, pulse };
      });

      ctx.lineWidth = 1;
      for (const [a, b] of links) {
        const pa = projected[a];
        const pb = projected[b];
        const depth = (pa.z + pb.z) * 0.5;
        const alpha = (0.18 + (depth + 1) * 0.16) * (mode === 'dark' ? 1 : 0.7);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      for (const p of projected) {
        const r = 1.1 + p.pulse * 1.6;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + p.pulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
