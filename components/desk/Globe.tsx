"use client";

import { useEffect, useRef } from "react";

type Land = { features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[] };
const SIZE = 224;
const TW = 1024;
const TH = 512;

// Small orthographic globe. Geometry is public-domain Natural Earth data.
// Only the hovered/focused globe renders frames; the rest of the desk uses CSS.
export default function Globe({ spinning }: { spinning: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const paint = useRef<((angle: number) => void) | null>(null);
  const angle = useRef(-1.65);
  useEffect(() => {
    const controller = new AbortController();
    const target = canvas.current;
    if (!target) return;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    fetch("/desk/land.geojson", { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error("Map unavailable");
      return r.json() as Promise<Land>;
    }).then(land => {
      if (controller.signal.aborted) return;
      const map = document.createElement("canvas"); map.width = TW; map.height = TH;
      const m = map.getContext("2d", { willReadFrequently: true }); if (!m) return;
      m.fillStyle = "#153334"; m.fillRect(0, 0, TW, TH);
      m.fillStyle = "#c99f4c";
      for (const feature of land.features) {
        const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates as number[][][]] : feature.geometry.coordinates as number[][][][];
        for (const polygon of polygons) {
          m.beginPath();
          for (const ring of polygon) ring.forEach(([lon, lat], i) => { const x = (lon + 180) / 360 * TW; const y = (90 - lat) / 180 * TH; if (i === 0) m.moveTo(x, y); else m.lineTo(x, y); });
          m.fill("evenodd");
        }
      }
      m.strokeStyle = "#d8b26544"; m.lineWidth = .6;
      for (let x = 0; x <= TW; x += TW / 24) { m.beginPath(); m.moveTo(x, 0); m.lineTo(x, TH); m.stroke(); }
      for (let y = 0; y <= TH; y += TH / 12) { m.beginPath(); m.moveTo(0, y); m.lineTo(TW, y); m.stroke(); }
      const texture = m.getImageData(0, 0, TW, TH).data;
      const frame = ctx.createImageData(SIZE, SIZE);
      const pixels: { i: number; lon: number; row: number; shade: number; shine: number }[] = [];
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const nx = (x + .5 - SIZE / 2) / (SIZE / 2); const ny = (y + .5 - SIZE / 2) / (SIZE / 2);
        const r = nx * nx + ny * ny; if (r > 1) continue;
        const z = Math.sqrt(1 - r);
        const lon = Math.atan2(nx, z); const lat = Math.asin(-ny);
        const light = Math.max(0, -.4 * nx - .5 * ny + .75 * z);
        const shine = Math.pow(Math.max(0, -.35 * nx - .4 * ny + .85 * z), 44) * 90;
        const i = (y * SIZE + x) * 4; frame.data[i + 3] = Math.min(255, (1 - Math.sqrt(r)) * SIZE * 180);
        pixels.push({ i, lon, row: Math.min(TH - 1, Math.floor((.5 - lat / Math.PI) * TH)) * TW, shade: .25 + .75 * light, shine });
      }
      paint.current = rotation => {
        for (const p of pixels) {
          const col = ((Math.floor(((p.lon + rotation) / (Math.PI * 2) + .5) * TW) % TW) + TW) % TW;
          const source = (p.row + col) * 4;
          for (let c = 0; c < 3; c++) frame.data[p.i + c] = texture[source + c] * p.shade + p.shine;
        }
        ctx.putImageData(frame, 0, 0); target.dataset.ready = "true";
      };
      paint.current(angle.current);
    }).catch(() => { /* Keep the photographed globe if the map cannot load. */ });
    return () => { controller.abort(); paint.current = null; };
  }, []);
  useEffect(() => {
    if (!spinning) return;
    let frame = 0; let last = 0;
    const tick = (time: number) => {
      if (time - last >= 32) { angle.current += Math.min(time - (last || time), 64) * .00022; last = time; paint.current?.(angle.current); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [spinning]);
  return <canvas ref={canvas} width={SIZE} height={SIZE} aria-hidden="true" data-spinning={spinning} />;
}
