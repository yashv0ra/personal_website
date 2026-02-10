"use client";

import { useEffect, useRef } from "react";

type Dot = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const GRID_SPACING = 34;
const DOT_BASE_SIZE = 1.2;
const INTERACTION_RADIUS = 128;
const PUSH_STRENGTH = 1.6;
const SPRING_STRENGTH = 0.09;
const DAMPING = 0.84;
const MAX_OFFSET = 30;

export default function InteractiveDotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const pointer = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      active: false,
      lastX: 0,
      lastY: 0,
      lastTimestamp: 0,
    };

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let prefersReducedMotion = false;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion = mediaQuery.matches;

    const radiusSquared = INTERACTION_RADIUS * INTERACTION_RADIUS;

    const resetDots = () => {
      const cols = Math.ceil(width / GRID_SPACING) + 1;
      const rows = Math.ceil(height / GRID_SPACING) + 1;
      const xOffset = (width - (cols - 1) * GRID_SPACING) / 2;
      const yOffset = (height - (rows - 1) * GRID_SPACING) / 2;

      dots = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const baseX = xOffset + col * GRID_SPACING;
          const baseY = yOffset + row * GRID_SPACING;
          dots.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(pixelRatio, pixelRatio);

      resetDots();
      drawFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;

      pointer.active = true;
      pointer.x = nextX;
      pointer.y = nextY;

      const now = performance.now();
      const elapsed = Math.max(16, now - pointer.lastTimestamp);
      const velocityScale = 16 / elapsed;

      pointer.vx = (nextX - pointer.lastX) * velocityScale;
      pointer.vy = (nextY - pointer.lastY) * velocityScale;

      pointer.lastX = nextX;
      pointer.lastY = nextY;
      pointer.lastTimestamp = now;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.vx = 0;
      pointer.vy = 0;
    };

    const clampDisplacement = (dot: Dot) => {
      const offsetX = dot.x - dot.baseX;
      const offsetY = dot.y - dot.baseY;
      const distance = Math.hypot(offsetX, offsetY);

      if (distance > MAX_OFFSET) {
        const ratio = MAX_OFFSET / distance;
        dot.x = dot.baseX + offsetX * ratio;
        dot.y = dot.baseY + offsetY * ratio;
        dot.vx *= 0.7;
        dot.vy *= 0.7;
      }
    };

    const drawFrame = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";

      for (const dot of dots) {
        if (!prefersReducedMotion && pointer.active) {
          const dx = dot.x - pointer.x;
          const dy = dot.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < radiusSquared) {
            const distance = Math.sqrt(distanceSquared) || 1;
            const falloff = 1 - distance / INTERACTION_RADIUS;
            const directionX = dx / distance;
            const directionY = dy / distance;

            dot.vx += directionX * falloff * PUSH_STRENGTH + pointer.vx * 0.02;
            dot.vy += directionY * falloff * PUSH_STRENGTH + pointer.vy * 0.02;
          }
        }

        dot.vx += (dot.baseX - dot.x) * SPRING_STRENGTH;
        dot.vy += (dot.baseY - dot.y) * SPRING_STRENGTH;
        dot.vx *= DAMPING;
        dot.vy *= DAMPING;

        dot.x += dot.vx;
        dot.y += dot.vy;
        clampDisplacement(dot);

        const speed = Math.hypot(dot.vx, dot.vy);
        const nearCursor = pointer.active
          ? Math.max(
              0,
              1 - Math.hypot(dot.baseX - pointer.x, dot.baseY - pointer.y) / INTERACTION_RADIUS
            )
          : 0;
        const alpha = Math.min(0.82, 0.12 + speed * 0.065 + nearCursor * 0.5);
        const size = DOT_BASE_SIZE + nearCursor * 1.55 + Math.min(0.8, speed * 0.25);

        context.globalAlpha = alpha;
        context.beginPath();
        context.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
    };

    const animate = () => {
      drawFrame();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      if (prefersReducedMotion) {
        pointer.active = false;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", resize);
    mediaQuery.addEventListener("change", onMotionPreferenceChange);

    resize();
    animate();

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      mediaQuery.removeEventListener("change", onMotionPreferenceChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="interactive-dot-field" aria-hidden="true" />;
}
