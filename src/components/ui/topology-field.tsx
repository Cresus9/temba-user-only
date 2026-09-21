import { useMemo, type CSSProperties } from 'react';

type EffectMode = 'light' | 'dark';

export type TopologyFieldProps = {
  mode?: EffectMode;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

export const TOPOLOGY_FIELD_DEFAULTS = {
  mode: 'dark',
  hue: 0,
  saturation: 1,
  brightness: 1,
} as const;

const topologySource = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="animationCanvas"></canvas>
  <script>
    const canvas = document.getElementById('animationCanvas');
    let width = window.innerWidth;
    let height = window.innerHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 300, 950);
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.z = 650;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const group = new THREE.Group();
    scene.add(group);
    const numNodes = 120;
    const nodes = [];
    const nodeGeo = new THREE.SphereGeometry(1, 16, 16);
    for (let i = 0; i < numNodes; i++) {
      const phi = Math.acos(-1 + (2 * i) / numNodes);
      const theta = Math.sqrt(numNodes * Math.PI) * phi;
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);
      const mesh = new THREE.Mesh(
        nodeGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      );
      mesh.position.set(x, y, z);
      mesh.userData = {
        baseSize: Math.random() * 1.5 + 1.0,
        pulseSpeed: Math.random() * 0.02 + 0.015,
        pulseOffset: Math.random() * Math.PI * 2
      };
      group.add(mesh);
      nodes.push(mesh);
    }
    const linePos = [];
    const lineColors = [];
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        const threshold = 0.45;
        if (dist < threshold) {
          linePos.push(nodes[i].position.x, nodes[i].position.y, nodes[i].position.z);
          linePos.push(nodes[j].position.x, nodes[j].position.y, nodes[j].position.z);
          const alpha = (1 - dist / threshold) * 0.8;
          lineColors.push(alpha, alpha, alpha);
          lineColors.push(alpha, alpha, alpha);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.65
      })
    );
    group.add(lines);
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      const R = width > 640 ? Math.min(height * 0.56, 290) : 155;
      group.scale.set(R, R, R);
      const centerX = width > 640 ? width * 0.34 : width * 0.38;
      const centerY = width > 640 ? -height * 0.04 : -height * 0.08;
      group.position.set(centerX, centerY, 0);
    }
    window.addEventListener('resize', resize);
    resize();
    let time = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function animate() {
      requestAnimationFrame(animate);
      if (!reduce) time += 1;
      group.rotation.y = time * 0.0018;
      group.rotation.x = 0.2;
      group.rotation.z = time * 0.0006;
      nodes.forEach(function (mesh) {
        const p = mesh.userData;
        const pulse = reduce ? 0.5 : (Math.sin(time * p.pulseSpeed + p.pulseOffset) + 1) / 2;
        const targetRadius = p.baseSize + pulse * 1.8;
        const scale = targetRadius / group.scale.x;
        mesh.scale.set(scale, scale, scale);
        mesh.material.opacity = 0.4 + pulse * 0.6;
      });
      renderer.render(scene, camera);
    }
    animate();
  <\/script>
</body>
</html>`;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default function TopologyField({
  mode = TOPOLOGY_FIELD_DEFAULTS.mode,
  hue = TOPOLOGY_FIELD_DEFAULTS.hue,
  saturation = TOPOLOGY_FIELD_DEFAULTS.saturation,
  brightness = TOPOLOGY_FIELD_DEFAULTS.brightness,
  className,
  style,
}: TopologyFieldProps) {
  const safeMode: EffectMode = mode === 'light' ? 'light' : 'dark';
  const source = useMemo(() => topologySource, []);
  const safeHue = clamp(hue, -180, 180);
  const safeSaturation = clamp(saturation, 0, 2);
  const safeBrightness = clamp(brightness, 0.35, 1.65);
  const filter =
    safeHue === 0 && safeSaturation === 1 && safeBrightness === 1
      ? undefined
      : `hue-rotate(${safeHue}deg) saturate(${safeSaturation}) brightness(${safeBrightness})`;

  return (
    <iframe
      className={className}
      data-mode={safeMode}
      title="Topology field"
      srcDoc={source}
      sandbox="allow-scripts"
      loading="eager"
      aria-hidden
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        border: 0,
        background: '#000000',
        filter,
        ...style,
      }}
    />
  );
}
