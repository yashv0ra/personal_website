export const CARD_TITLES = ["About", "Resume", "Lab"] as const;
export type CardIndex = 0 | 1 | 2;
export type RoomPhase = "ready" | "revealing" | "switching";
export const INTRO_MS = { pulse: 450, expand: 650, black: 250, reveal: 2100 };
export const SWITCH_MS = 1100;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const nextCard = (index: CardIndex, direction: number): CardIndex => ((index + direction + 3) % 3) as CardIndex;

// Bounded ignition: weak light, one dip, then steady output. No random flashes.
export function switchLight(ms: number): number {
  if (ms < 100) return 1 - smooth(ms / 100);
  if (ms < 580) return 0;
  if (ms < 700) return 0.36 * smooth((ms - 580) / 120);
  if (ms < 800) return 0.36 - 0.28 * smooth((ms - 700) / 100);
  return 0.08 + 0.92 * smooth((ms - 800) / 300);
}
