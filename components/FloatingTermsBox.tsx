"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { RESUME_PILL_SELECT_EVENT, type ResumePillSelectDetail } from "@/lib/chatEvents";

export type FloatingTermCategory =
  | "Technical Skill"
  | "Business Skill"
  | "Ask Me About";

export type FloatingTerm = {
  label: string;
  category: FloatingTermCategory;
};

type BubbleState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
};

type FloatingTermsBoxProps = {
  terms: FloatingTerm[];
};

const MIN_SPEED = 14;
const MAX_SPEED = 26;
const BUBBLE_MARGIN = 10;
const ARENA_PADDING_X = 14;
const ARENA_PADDING_TOP = 76;
const ARENA_PADDING_BOTTOM = 16;
const bubbleClassName =
  "absolute inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.06em] whitespace-nowrap opacity-0 transition-[box-shadow,transform,opacity] duration-200 sm:text-sm";

const bubbleStyles: Record<FloatingTermCategory, string> = {
  "Technical Skill":
    "border-emerald-300 bg-emerald-100/90 text-emerald-900 shadow-[0_10px_25px_rgba(5,150,105,0.25)]",
  "Business Skill":
    "border-sky-300 bg-sky-100/90 text-sky-900 shadow-[0_10px_25px_rgba(2,132,199,0.22)]",
  "Ask Me About":
    "border-amber-300 bg-amber-100/90 text-amber-900 shadow-[0_10px_25px_rgba(217,119,6,0.22)]",
};

function randomSpeed(): number {
  return MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
}

function randomVelocity(): { vx: number; vy: number } {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomSpeed();
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  return {
    vx: Math.abs(vx) < 6 ? Math.sign(vx || 1) * 6 : vx,
    vy: Math.abs(vy) < 6 ? Math.sign(vy || 1) * 6 : vy,
  };
}

function bubblesOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  placed: BubbleState[],
): boolean {
  return placed.some((bubble) => {
    const horizontal =
      x < bubble.x + bubble.width + BUBBLE_MARGIN &&
      x + width + BUBBLE_MARGIN > bubble.x;
    const vertical =
      y < bubble.y + bubble.height + BUBBLE_MARGIN &&
      y + height + BUBBLE_MARGIN > bubble.y;
    return horizontal && vertical;
  });
}

export default function FloatingTermsBox({ terms }: FloatingTermsBoxProps) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bubbleStatesRef = useRef<BubbleState[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const previousTimestampRef = useRef<number | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const pinnedIndexRef = useRef<number | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  useEffect(() => {
    hoveredIndexRef.current = hoveredIndex;
  }, [hoveredIndex]);

  useEffect(() => {
    pinnedIndexRef.current = pinnedIndex;
  }, [pinnedIndex]);

  const hasTerms = terms.length > 0;
  const activeTooltipIndex = hoveredIndex ?? pinnedIndex;

  const dispatchPillSelect = useCallback((label: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const detail: ResumePillSelectDetail = { label };
    window.dispatchEvent(new CustomEvent<ResumePillSelectDetail>(RESUME_PILL_SELECT_EVENT, { detail }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncCompactMode = (event?: MediaQueryListEvent) => {
      if (event) {
        setIsCompact(event.matches);
        return;
      }
      setIsCompact(mediaQuery.matches);
    };

    syncCompactMode();
    mediaQuery.addEventListener("change", syncCompactMode);
    return () => mediaQuery.removeEventListener("change", syncCompactMode);
  }, []);

  const initializeBubbles = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena || terms.length === 0 || isCompact) {
      bubbleStatesRef.current = [];
      return;
    }

    const arenaWidth = arena.clientWidth;
    const arenaHeight = arena.clientHeight;
    if (arenaWidth === 0 || arenaHeight === 0) {
      return;
    }

    const placed: BubbleState[] = [];

    for (let index = 0; index < terms.length; index += 1) {
      const bubble = bubbleRefs.current[index];
      if (!bubble) {
        continue;
      }

      const width = bubble.offsetWidth;
      const height = bubble.offsetHeight;

      const minX = ARENA_PADDING_X;
      const maxX = Math.max(minX, arenaWidth - width - ARENA_PADDING_X);
      const minY = ARENA_PADDING_TOP;
      const maxY = Math.max(minY, arenaHeight - height - ARENA_PADDING_BOTTOM);

      let x = minX;
      let y = minY;
      let foundSpot = false;
      for (let attempt = 0; attempt < 140; attempt += 1) {
        const candidateX = minX + Math.random() * (maxX - minX || 0);
        const candidateY = minY + Math.random() * (maxY - minY || 0);
        if (!bubblesOverlap(candidateX, candidateY, width, height, placed)) {
          x = candidateX;
          y = candidateY;
          foundSpot = true;
          break;
        }
      }

      if (!foundSpot) {
        x = minX + Math.random() * (maxX - minX || 0);
        y = minY + Math.random() * (maxY - minY || 0);
      }

      const { vx, vy } = randomVelocity();
      const state: BubbleState = { x, y, vx, vy, width, height };
      placed.push(state);
      bubble.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      bubble.style.opacity = "1";
    }

    bubbleStatesRef.current = placed;
    previousTimestampRef.current = null;
  }, [isCompact, terms]);

  useEffect(() => {
    if (isCompact) {
      bubbleStatesRef.current = [];
      return undefined;
    }

    initializeBubbles();

    const arena = arenaRef.current;
    if (!arena) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      initializeBubbles();
    });

    observer.observe(arena);
    return () => observer.disconnect();
  }, [initializeBubbles, isCompact]);

  useEffect(() => {
    if (!hasTerms || isCompact) {
      return undefined;
    }

    const animate = (timestamp: number) => {
      const arena = arenaRef.current;
      if (!arena) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const previous = previousTimestampRef.current;
      previousTimestampRef.current = timestamp;
      const deltaSeconds =
        previous === null ? 0 : Math.min((timestamp - previous) / 1000, 0.05);

      const arenaWidth = arena.clientWidth;
      const arenaHeight = arena.clientHeight;
      const hovered = hoveredIndexRef.current;
      const pinned = pinnedIndexRef.current;

      for (let index = 0; index < bubbleStatesRef.current.length; index += 1) {
        const state = bubbleStatesRef.current[index];
        const bubble = bubbleRefs.current[index];
        if (!state || !bubble) {
          continue;
        }

        const isPaused = index === hovered || index === pinned;
        if (!isPaused) {
          state.x += state.vx * deltaSeconds;
          state.y += state.vy * deltaSeconds;

          const minX = ARENA_PADDING_X;
          const maxX = Math.max(minX, arenaWidth - state.width - ARENA_PADDING_X);
          const minY = ARENA_PADDING_TOP;
          const maxY = Math.max(
            minY,
            arenaHeight - state.height - ARENA_PADDING_BOTTOM,
          );

          if (state.x <= minX) {
            state.x = minX;
            state.vx = Math.abs(state.vx);
          } else if (state.x >= maxX) {
            state.x = maxX;
            state.vx = -Math.abs(state.vx);
          }

          if (state.y <= minY) {
            state.y = minY;
            state.vy = Math.abs(state.vy);
          } else if (state.y >= maxY) {
            state.y = maxY;
            state.vy = -Math.abs(state.vy);
          }
        }

        bubble.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
    };
  }, [hasTerms, isCompact]);

  const handleArenaPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-floating-term='true']")) {
        setPinnedIndex(null);
      }
    },
    [],
  );

  if (isCompact) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-white/85 p-3 sm:p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--card-muted)]">
          Tap any topic to ask chat
        </p>
        <div className="flex flex-wrap gap-2">
          {terms.map((term) => (
            <button
              type="button"
              key={`${term.category}-${term.label}`}
              className={`${bubbleStyles[term.category]} inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold leading-tight`}
              onClick={() => dispatchPillSelect(term.label)}
              aria-label={`${term.label} (${term.category})`}
            >
              {term.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={arenaRef}
      onPointerDown={handleArenaPointerDown}
      className="relative h-[23rem] w-full overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[radial-gradient(circle_at_20%_20%,rgba(253,123,65,0.16),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(60,64,68,0.1),transparent_45%),linear-gradient(145deg,rgba(255,255,255,0.92),rgba(221,220,219,0.74))]"
    >
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex flex-wrap gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[var(--accent-charcoal)] sm:text-[0.62rem]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/90 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Technical Skill
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100/90 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Business Skill
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Ask Me About
        </span>
      </div>

      {terms.map((term, index) => {
        const isActive = activeTooltipIndex === index;
        return (
          <button
            type="button"
            key={`${term.category}-${term.label}`}
            ref={(node) => {
              bubbleRefs.current[index] = node;
            }}
            data-floating-term="true"
            className={`${bubbleClassName} ${bubbleStyles[term.category]}`}
            onMouseEnter={() => {
              hoveredIndexRef.current = index;
              setHoveredIndex(index);
            }}
            onMouseLeave={() =>
              setHoveredIndex((current) => {
                if (current === index) {
                  hoveredIndexRef.current = null;
                  return null;
                }
                return current;
              })
            }
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex((current) => (current === index ? null : current))}
            onClick={() => dispatchPillSelect(term.label)}
            onPointerDown={(event) => {
              event.stopPropagation();
              if (event.pointerType === "touch" || event.pointerType === "pen") {
                setPinnedIndex((current) => (current === index ? null : index));
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setPinnedIndex((current) => (current === index ? null : index));
              }
            }}
            aria-label={`${term.label} (${term.category})`}
          >
            <span className="pointer-events-none">{term.label}</span>
            <span
              className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[1.65rem] rounded-full border border-[var(--card-border)] bg-white/95 px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] whitespace-nowrap text-[var(--accent-charcoal)] shadow-sm transition-opacity duration-150 ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              role="status"
              aria-live="polite"
            >
              Learn more about this experience?
            </span>
          </button>
        );
      })}
    </div>
  );
}
