const s = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ic = "h-[18px] w-[18px]";

export function IcBrush() {
  return (
    <svg {...s} className={ic}>
      <path d="M4 20l2-6L17 3a2 2 0 1 1 3 3L9 17Z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  );
}

export function IcEraser() {
  return (
    <svg {...s} className={ic}>
      <path d="M7 21h10" />
      <path d="M18 13l-7 7H8l-3-3 10-10 3 3Z" />
    </svg>
  );
}

export function IcLine() {
  return (
    <svg {...s} className={ic}>
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  );
}

export function IcRect() {
  return (
    <svg {...s} className={ic}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

export function IcCircle() {
  return (
    <svg {...s} className={ic}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function IcSelect() {
  return (
    <svg {...s} className={ic}>
      <path d="M5 3l12 9-5 1-3 5Z" />
    </svg>
  );
}

export function IcUndo() {
  return (
    <svg {...s} className={ic}>
      <path d="M9 14L4 9l5-5" />
      <path d="M20 20v-5a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

export function IcRedo() {
  return (
    <svg {...s} className={ic}>
      <path d="M15 14l5-5-5-5" />
      <path d="M4 20v-5a4 4 0 0 1 4-4h12" />
    </svg>
  );
}

export function IcTrash() {
  return (
    <svg {...s} className={ic}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}

export function IcDownload() {
  return (
    <svg {...s} className={ic}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function IcCopy() {
  return (
    <svg {...s} className={ic}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IcPaste() {
  return (
    <svg {...s} className={ic}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

export function IcFill() {
  return (
    <svg {...s} className={ic}>
      <path d="M2 22l1-4L14.5 6.5a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3L7 22Z" />
      <path d="M20 14s2 2 2 4-1 3-2 3-2-1-2-3 2-4 2-4Z" />
    </svg>
  );
}

export function IcDelete() {
  return (
    <svg {...s} className={ic}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IcSparkle() {
  return (
    <svg {...s} className={ic}>
      <path
        d="M12 3l1.8 5.4L19 12l-5.2 3.6L12 21l-1.8-5.4L5 12l5.2-3.6Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function IcBack() {
  return (
    <svg {...s} className={ic}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IcFlask() {
  return (
    <svg {...s} className="h-8 w-8">
      <path d="M9 3h6M10 3v6.5l-4.6 7.7A2.5 2.5 0 0 0 7.6 21h8.8a2.5 2.5 0 0 0 2.2-3.8L14 9.5V3" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function IcPaint() {
  return (
    <svg {...s} className="h-8 w-8">
      <path d="M4 20l2-6L17 3a2 2 0 1 1 3 3L9 17Z" />
      <path d="M14.5 6.5l3 3" />
      <path d="M3 21h18" />
    </svg>
  );
}

import type { ReactNode } from "react";

export const TOOL_ICON_MAP: Record<string, () => ReactNode> = {
  brush: IcBrush,
  eraser: IcEraser,
  line: IcLine,
  rectangle: IcRect,
  circle: IcCircle,
  select: IcSelect,
};
