"use client";

import {
  type FormEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CHARADES_DIFFICULTIES,
  CHARADES_PROMPTS,
  type CharadesDifficulty,
  type CharadesPrompt,
} from "./charadesPrompts";
import {
  IcBrush,
  IcEraser,
  IcLine,
  IcRect,
  IcCircle,
  IcSelect,
  IcUndo,
  IcRedo,
  IcTrash,
  IcDownload,
  IcCopy,
  IcPaste,
  IcFill,
  IcDelete,
  IcSparkle,
  IcBack,
  IcPaint,
  TOOL_ICON_MAP,
} from "./icons";
import Link from "next/link";

type Point = {
  x: number;
  y: number;
};

type ToolName =
  | "brush"
  | "eraser"
  | "line"
  | "rectangle"
  | "circle"
  | "select";

type RectRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const MAX_HISTORY = 20;
const DEFAULT_CHARADES_DAILY_GUESS_LIMIT = 30;
const PALETTE = [
  "#000000",
  "#1f2937",
  "#6b7280",
  "#d1d5db",
  "#ffffff",
  "#ef4444",
  "#fb7185",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#7c3aed",
  "#d946ef",
];
const TOOL_OPTIONS: Array<{
  value: ToolName;
  label: string;
  description: string;
}> = [
  { value: "brush", label: "Brush", description: "Freehand sketch" },
  {
    value: "eraser",
    label: "Eraser",
    description: "Paint over with background",
  },
  { value: "line", label: "Line", description: "Straight stroke" },
  { value: "rectangle", label: "Rectangle", description: "Shape outline" },
  { value: "circle", label: "Circle", description: "Round outline" },
  { value: "select", label: "Select", description: "Region actions" },
];

const LAB_OPTIONS = [
  {
    id: "paint-charades",
    title: "Paint + Charades",
    tag: "Interactive Lab",
    description:
      "Sketch clues and run AI-powered charades guesses in one compact experiment space.",
    action: "Open project",
  },
] as const;

type LabProjectId = (typeof LAB_OPTIONS)[number]["id"];
type ConfettiPiece = {
  id: number;
  left: number;
  drift: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  rotation: number;
};

const CONFETTI_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

const CHARADES_INSTRUCTIONS =
  "Draw your best interpretation of the prompt, then hit Guess for the AI to evaluate your artwork.";
const CHARADES_INSTRUCTIONS_POSTSCRIPT =
  "Guesses are rate-limited to manage API costs.";

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function tokenizeGuessText(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const insertions = current[j - 1] + 1;
      const deletions = previous[j] + 1;
      const substitutions =
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(insertions, deletions, substitutions);
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function isTokenCloseMatch(token: string, target: string): boolean {
  if (token === target) {
    return true;
  }

  const lengthGap = Math.abs(token.length - target.length);
  if (lengthGap > 2) {
    return false;
  }

  if (token.length >= 4 && target.length >= 4) {
    if (token.includes(target) || target.includes(token)) {
      return true;
    }
  }

  const maxDistance = target.length <= 4 ? 1 : 2;
  return levenshteinDistance(token, target) <= maxDistance;
}

function guessMatchesPrompt(
  guess: string,
  prompt: CharadesPrompt | null,
): boolean {
  if (!prompt) {
    return false;
  }

  const guessTokens = tokenizeGuessText(guess);
  if (guessTokens.length === 0) {
    return false;
  }

  const targets = [prompt.word, ...prompt.aliases]
    .map((item) => normalizeToken(item))
    .filter(Boolean);
  if (targets.length === 0) {
    return false;
  }

  return guessTokens.some((token) =>
    targets.some((target) =>
      isTokenCloseMatch(normalizeToken(token), target),
    ),
  );
}

function createConfettiPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 220,
    size: 6 + Math.random() * 8,
    duration: 2400 + Math.random() * 1600,
    delay: Math.random() * 550,
    color:
      CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ??
      "#ffffff",
    rotation: Math.random() * 360,
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRect(rect: RectRegion): RectRegion {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x;
  const y = rect.height < 0 ? rect.y + rect.height : rect.y;
  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): Point {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * CANVAS_WIDTH) / rect.width;
  const y = ((event.clientY - rect.top) * CANVAS_HEIGHT) / rect.height;
  return {
    x: clamp(x, 0, CANVAS_WIDTH),
    y: clamp(y, 0, CANVAS_HEIGHT),
  };
}

function clearCanvasSurface(canvas: HTMLCanvasElement, color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawSelectOutline(
  canvas: HTMLCanvasElement,
  rect: RectRegion,
  color: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const safeRect = normalizeRect(rect);
  const isInBounds =
    safeRect.width > 1 &&
    safeRect.height > 1 &&
    safeRect.x < CANVAS_WIDTH &&
    safeRect.y < CANVAS_HEIGHT;
  if (!isInBounds) {
    return;
  }
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.strokeRect(
    safeRect.x + 0.5,
    safeRect.y + 0.5,
    safeRect.width,
    safeRect.height,
  );
  ctx.setLineDash([]);
}

type VisionRateState = {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
};

type VisionRateStateWithCooldown = VisionRateState & {
  cooldownMs: number | null;
};

const defaultRateState = (
  limit: number | null = DEFAULT_CHARADES_DAILY_GUESS_LIMIT,
  remaining: number | null = DEFAULT_CHARADES_DAILY_GUESS_LIMIT,
) =>
  ({
    limit,
    remaining,
    resetAt: null,
    cooldownMs: 0,
  }) as VisionRateStateWithCooldown;

type VisionMeta = {
  guess: string;
  usage: {
    promptTokens: number | null;
    totalTokens: number | null;
  };
  rateLimit: VisionRateState;
  localRateLimit: VisionRateStateWithCooldown;
};

type VisionErrorMeta = {
  message?: string;
  rateLimit: VisionRateState;
  localRateLimit?: VisionRateStateWithCooldown;
};

/* ------------------------------------------------------------------ */
/*  Paint + Charades project                                          */
/* ------------------------------------------------------------------ */

function PaintCharadesProject() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolName>("brush");
  const [color, setColor] = useState("#1f2937");
  const [brushSize, setBrushSize] = useState(8);
  const [isCharadesMode, setIsCharadesMode] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const [activeSelection, setActiveSelection] = useState<RectRegion | null>(
    null,
  );
  const [clipboardImage, setClipboardImage] = useState<ImageData | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);
  const [guessError, setGuessError] = useState("");
  const [guessResult, setGuessResult] = useState("");
  const [rateState, setRateState] = useState<VisionRateState>({
    limit: null,
    remaining: null,
    resetAt: null,
  });
  const [localRateState, setLocalRateState] =
    useState<VisionRateStateWithCooldown>(defaultRateState());
  const [tokenUsage, setTokenUsage] = useState({
    prompt: 0,
    total: 0,
  });
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<CharadesDifficulty>("easy");
  const [activePrompt, setActivePrompt] = useState<CharadesPrompt | null>(
    null,
  );
  const [roundWon, setRoundWon] = useState(false);
  const [roundStatus, setRoundStatus] = useState("");
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  const pointerDownRef = useRef(false);
  const toolStartRef = useRef<Point | null>(null);
  const pendingRegionRef = useRef<RectRegion | null>(null);
  const isRestoringRef = useRef(false);
  const snapshotRef = useRef<ImageData | null>(null);
  const selectedRef = useRef<RectRegion | null>(null);
  const lastPointerIdRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const background = "#ffffff";
  const charadesLockedTools = useMemo(
    () => new Set<ToolName>(["line", "rectangle", "circle"]),
    [],
  );

  const isToolLocked = useCallback(
    (value: ToolName) => isCharadesMode && charadesLockedTools.has(value),
    [isCharadesMode, charadesLockedTools],
  );

  const latestCanvas = useMemo(() => {
    return history.at(-1) ?? "";
  }, [history]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) {
      return;
    }

    clearCanvasSurface(canvas, background);
    const overlayCtx = overlay.getContext("2d");
    if (!overlayCtx) {
      return;
    }
    overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory([canvas.toDataURL("image/png")]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !latestCanvas || isRestoringRef.current) {
      return;
    }
    isRestoringRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      isRestoringRef.current = false;
      return;
    }
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(image, 0, 0);
      isRestoringRef.current = false;
    };
    image.src = latestCanvas;
  }, [latestCanvas]);

  useEffect(() => {
    if (!localRateState.cooldownMs || localRateState.cooldownMs <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setLocalRateState((current) => ({
        ...current,
        cooldownMs: Math.max(0, (current.cooldownMs ?? 0) - 1000),
      }));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [localRateState.cooldownMs]);

  useEffect(() => {
    if (!isCharadesMode || !isToolLocked(tool)) {
      return;
    }
    setTool("brush");
  }, [isCharadesMode, isToolLocked, tool]);

  const clearConfetti = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
    setConfettiPieces([]);
  }, []);

  const triggerConfetti = useCallback(() => {
    clearConfetti();
    setConfettiPieces(createConfettiPieces(140));
    confettiTimerRef.current = window.setTimeout(() => {
      setConfettiPieces([]);
      confettiTimerRef.current = null;
    }, 4600);
  }, [clearConfetti]);

  useEffect(() => {
    return () => {
      clearConfetti();
    };
  }, [clearConfetti]);

  useEffect(() => {
    setActivePrompt(null);
    setRoundWon(false);
    setRoundStatus("");
  }, [selectedDifficulty]);

  const handleGeneratePrompt = useCallback(() => {
    const pool = CHARADES_PROMPTS[selectedDifficulty];
    if (pool.length === 0) {
      return;
    }

    const currentWord = activePrompt?.word ?? null;
    let nextPrompt =
      pool[Math.floor(Math.random() * pool.length)] ?? null;
    if (!nextPrompt) {
      return;
    }

    if (pool.length > 1 && currentWord && nextPrompt.word === currentWord) {
      const index = pool.findIndex((entry) => entry.word === currentWord);
      const nextIndex =
        index >= 0
          ? (index + 1 + Math.floor(Math.random() * (pool.length - 1))) %
            pool.length
          : 0;
      nextPrompt = pool[nextIndex] ?? nextPrompt;
    }

    setActivePrompt(nextPrompt);
    setRoundWon(false);
    setRoundStatus("");
    setGuessError("");
    setGuessResult("");
    clearConfetti();
  }, [activePrompt, clearConfetti, selectedDifficulty]);

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const snapshot = canvas.toDataURL("image/png");
    setHistory((current) => {
      const next = [...current, snapshot].slice(-MAX_HISTORY);
      return next;
    });
    setRedoHistory([]);
  };

  const restoreHistory = (imageUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    isRestoringRef.current = true;
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(image, 0, 0);
      isRestoringRef.current = false;
    };
    image.src = imageUrl;
  };

  const updateSelection = (rect: RectRegion | null) => {
    const normalized = rect ? normalizeRect(rect) : null;
    setActiveSelection(normalized);
    selectedRef.current = normalized;
  };

  const setDefaultsForDrawing = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = tool === "eraser" ? background : color;
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== undefined) {
      return;
    }
    if (isToolLocked(tool)) {
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    if (tool !== "select") {
      updateSelection(null);
    }
    if (lastPointerIdRef.current !== null) {
      return;
    }
    lastPointerIdRef.current = event.pointerId;
    pointerDownRef.current = true;

    const point = pointFromEvent(event);
    toolStartRef.current = point;

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      setDefaultsForDrawing(ctx);
      ctx.stroke();
      return;
    }

    snapshotRef.current = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    pendingRegionRef.current = {
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      !pointerDownRef.current ||
      !toolStartRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const point = pointFromEvent(event);
    if (tool === "brush" || tool === "eraser") {
      setDefaultsForDrawing(ctx);
      ctx.beginPath();
      ctx.moveTo(toolStartRef.current.x, toolStartRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      toolStartRef.current = point;
      return;
    }

    const snapshot = snapshotRef.current;
    if (!snapshot) {
      return;
    }

    ctx.putImageData(snapshot, 0, 0);

    if (tool === "line") {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.moveTo(toolStartRef.current.x, toolStartRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else if (tool === "rectangle") {
      const currentWidth = point.x - toolStartRef.current.x;
      const currentHeight = point.y - toolStartRef.current.y;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(
        toolStartRef.current.x,
        toolStartRef.current.y,
        currentWidth,
        currentHeight,
      );
    } else if (tool === "circle") {
      const radiusX = Math.abs(point.x - toolStartRef.current.x);
      const radiusY = Math.abs(point.y - toolStartRef.current.y);
      const radius = Math.max(2, Math.max(radiusX, radiusY));
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.arc(
        toolStartRef.current.x,
        toolStartRef.current.y,
        radius,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (tool === "select") {
      const currentWidth = point.x - toolStartRef.current.x;
      const currentHeight = point.y - toolStartRef.current.y;
      const region = {
        x: toolStartRef.current.x,
        y: toolStartRef.current.y,
        width: currentWidth,
        height: currentHeight,
      };
      pendingRegionRef.current = region;
      const safeRegion = normalizeRect(region);
      const overlay = overlayRef.current;
      if (overlay) {
        const overlayCtx = overlay.getContext("2d");
        if (!overlayCtx) {
          return;
        }
        overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        overlayCtx.setLineDash([6, 5]);
        overlayCtx.strokeStyle = "#3b82f6";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.strokeRect(
          safeRegion.x,
          safeRegion.y,
          safeRegion.width,
          safeRegion.height,
        );
        overlayCtx.setLineDash([]);
      }
    }
  };

  const finalizeShape = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !toolStartRef.current) {
      return;
    }

    if (tool === "select") {
      const region = pendingRegionRef.current;
      if (!region || (region.width === 0 && region.height === 0)) {
        updateSelection(null);
      } else {
        const normalized = normalizeRect(region);
        updateSelection(normalized);
      }
      return;
    }

    if (tool === "brush" || tool === "eraser") {
      pushHistory();
      return;
    }

    if (tool === "line" || tool === "rectangle" || tool === "circle") {
      const region = pendingRegionRef.current;
      if (!region) {
        return;
      }
      const hasMovement =
        Math.abs(region.width) > 0 || Math.abs(region.height) > 0;
      if (hasMovement) {
        pushHistory();
      }
    }
  };

  const handlePointerUp = () => {
    if (!pointerDownRef.current) {
      return;
    }
    finalizeShape();
    pointerDownRef.current = false;
    toolStartRef.current = null;
    snapshotRef.current = null;
    pendingRegionRef.current = null;
    lastPointerIdRef.current = null;
  };

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const imageUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    anchor.download = "paint-charades-canvas.png";
    anchor.click();
  };

  const handleUndo = () => {
    if (history.length <= 1) {
      return;
    }
    setHistory((current) => {
      if (current.length <= 1) {
        return current;
      }
      const next = [...current];
      const last = next.pop();
      if (last) {
        setRedoHistory((previous) =>
          [last, ...previous].slice(0, MAX_HISTORY),
        );
      }
      if (next.length > 0) {
        restoreHistory(next[next.length - 1]);
      }
      return next;
    });
    updateSelection(null);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) {
      return;
    }
    const next = redoHistory[0];
    if (!next) {
      return;
    }
    setRedoHistory((current) => current.slice(1));
    setHistory((current) => [...current, next].slice(-MAX_HISTORY));
    restoreHistory(next);
    updateSelection(null);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    clearCanvasSurface(canvas, background);
    setHistory((current) => {
      const next = [...current, canvas.toDataURL("image/png")];
      return next.slice(-MAX_HISTORY);
    });
    setRedoHistory([]);
    updateSelection(null);
    setGuessResult("");
    setGuessError("");
    setRoundWon(false);
    setRoundStatus("");
    clearConfetti();
  };

  const handleFillSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedRef.current) {
      return;
    }
    const rect = selectedRef.current;
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    pushHistory();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    updateSelection(null);
  };

  const handleCopySelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedRef.current) {
      return;
    }
    const rect = selectedRef.current;
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    setClipboardImage(
      ctx.getImageData(rect.x, rect.y, rect.width, rect.height),
    );
  };

  const handlePasteSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !clipboardImage) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    pushHistory();
    const x = selectedRef.current?.x ?? 40;
    const y = selectedRef.current?.y ?? 40;
    const maxX = Math.max(
      0,
      Math.min(CANVAS_WIDTH - clipboardImage.width, x),
    );
    const maxY = Math.max(
      0,
      Math.min(CANVAS_HEIGHT - clipboardImage.height, y),
    );
    ctx.putImageData(clipboardImage, maxX, maxY);
    if (selectedRef.current) {
      updateSelection({
        x: maxX,
        y: maxY,
        width: clipboardImage.width,
        height: clipboardImage.height,
      });
    }
  };

  const handleDeleteSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedRef.current) {
      return;
    }
    const rect = selectedRef.current;
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    pushHistory();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    updateSelection(null);
  };

  const handleGuess = async (event: FormEvent) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const cooldownMs = localRateState.cooldownMs ?? 0;
    const hasRemainingGuesses =
      localRateState.limit == null ||
      localRateState.remaining == null ||
      localRateState.remaining > 0;
    if (!canvas || isGuessing) {
      return;
    }
    if (roundWon) {
      setGuessError(
        "Round complete. Press Clear to reset the canvas before guessing again.",
      );
      return;
    }
    if (cooldownMs > 0) {
      setGuessError(
        `Please wait ${Math.ceil(cooldownMs / 1000)} seconds before guessing again.`,
      );
      return;
    }
    if (!hasRemainingGuesses) {
      setGuessError(
        `Daily charades limit reached. Try again at ${localRateState.resetAt ?? "your next reset time"}.`,
      );
      return;
    }
    setIsGuessing(true);
    setGuessError("");
    setGuessResult("Checking your drawing...");
    const imageData = canvas.toDataURL("image/png");
    try {
      const response = await fetch("/api/lab/vision-guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: imageData,
        }),
      });
      let result: VisionMeta & VisionErrorMeta;
      try {
        result = (await response.json()) as VisionMeta & VisionErrorMeta;
      } catch {
        setGuessResult("");
        setGuessError("The server returned an invalid response.");
        return;
      }
      if (!response.ok) {
        setRateState({
          limit: result.rateLimit?.limit ?? null,
          remaining: result.rateLimit?.remaining ?? null,
          resetAt: result.rateLimit?.resetAt ?? null,
        });
        setLocalRateState(result.localRateLimit ?? defaultRateState());
        setGuessResult("");
        setGuessError(
          result.message ?? "Could not process your request right now.",
        );
        return;
      }
      setGuessResult(result.guess);
      setLocalRateState(result.localRateLimit);
      setTokenUsage({
        prompt: result.usage?.promptTokens ?? 0,
        total: result.usage?.totalTokens ?? 0,
      });
      setRateState({
        limit: result.rateLimit?.limit ?? null,
        remaining: result.rateLimit?.remaining ?? null,
        resetAt: result.rateLimit?.resetAt ?? null,
      });
      if (guessMatchesPrompt(result.guess, activePrompt)) {
        setRoundWon(true);
        setRoundStatus(
          `Confetti! The model guessed close to "${activePrompt?.word}". Press Clear to reset the canvas and start your next round.`,
        );
        triggerConfetti();
      }
    } catch {
      setGuessResult("");
      setGuessError("Could not contact the guess endpoint.");
    } finally {
      setIsGuessing(false);
    }
  };

  const hasSelection = Boolean(
    activeSelection &&
      activeSelection.width > 0 &&
      activeSelection.height > 0,
  );
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }
    const overlayCtx = overlay.getContext("2d");
    if (!overlayCtx) {
      return;
    }
    overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (
      !activeSelection ||
      activeSelection.width <= 0 ||
      activeSelection.height <= 0
    ) {
      return;
    }
    drawSelectOutline(overlay, activeSelection, "#3b82f6");
  }, [activeSelection]);

  const charadesCooldownMs = localRateState.cooldownMs ?? 0;
  const hasRemainingGuesses =
    localRateState.limit == null ||
    localRateState.remaining == null ||
    localRateState.remaining > 0;
  const charadesGuessesLeftText =
    localRateState.limit !== null && localRateState.remaining !== null
      ? `${localRateState.remaining}/${localRateState.limit} guesses left`
      : "Loading rate budget...";
  const charadesCooldownText =
    charadesCooldownMs > 0
      ? `Next guess in ${Math.ceil(charadesCooldownMs / 1000)}s`
      : null;
  const charadesDisabled =
    roundWon || isGuessing || charadesCooldownMs > 0 || !hasRemainingGuesses;
  const toolDescription =
    TOOL_OPTIONS.find((entry) => entry.value === tool)?.description ?? "";
  const charadesButtonText = roundWon
    ? "Reset canvas first"
    : isGuessing
      ? "Guessing..."
      : !hasRemainingGuesses
        ? "Daily limit reached"
        : charadesDisabled
          ? "Please wait..."
          : "Guess";
  const activePromptAliases = activePrompt
    ? activePrompt.aliases.slice(0, 2)
    : [];

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <section className="flex h-[calc(100svh-5rem)] flex-col gap-3 xl:flex-row">
      {/* ---------- Confetti overlay ---------- */}
      {confettiPieces.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              key={`${piece.id}-${piece.left.toFixed(2)}-${piece.delay.toFixed(0)}`}
              className="absolute top-[-5vh] block rounded-sm"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${piece.size * 0.7}px`,
                opacity: 0.92,
                backgroundColor: piece.color,
                transform: `translate3d(0, 0, 0) rotate(${piece.rotation}deg)`,
                ["--confetti-drift" as string]: `${piece.drift}px`,
                animation: `lab-confetti-fall ${piece.duration}ms linear ${piece.delay}ms forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* ---------- Canvas area ---------- */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Canvas wrapper */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="h-full w-full touch-none"
          />
          <canvas
            ref={overlayRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          />

          {/* Floating: tool description pill */}
          <div className="float-bar pointer-events-none absolute left-3 top-3 z-20 px-3 py-1.5 text-[0.65rem] font-medium tracking-wide text-[var(--card-muted)]">
            {toolDescription}
          </div>

          {/* Floating: action bar (top-right) */}
          <div className="float-bar absolute right-3 top-3 z-20 flex items-center gap-0.5 p-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length <= 1}
              title="Undo"
              aria-label="Undo"
              className="icon-btn"
            >
              <IcUndo />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoHistory.length === 0}
              title="Redo"
              aria-label="Redo"
              className="icon-btn"
            >
              <IcRedo />
            </button>
            <div className="mx-1 h-5 w-px bg-black/10" />
            <button
              type="button"
              onClick={handleClearCanvas}
              title="Clear canvas"
              aria-label="Clear canvas"
              className="icon-btn"
            >
              <IcTrash />
            </button>
            <button
              type="button"
              onClick={handleSaveImage}
              title="Save drawing"
              aria-label="Save drawing"
              className="icon-btn"
            >
              <IcDownload />
            </button>
          </div>

          {/* Floating: tool bar (bottom-left) */}
          <div className="float-bar absolute bottom-3 left-3 z-20 flex items-center gap-0.5 p-1">
            {TOOL_OPTIONS.map((entry) => {
              const Icon = TOOL_ICON_MAP[entry.value];
              const active = tool === entry.value;
              const locked = isToolLocked(entry.value);
              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => {
                    if (!locked) setTool(entry.value);
                  }}
                  disabled={locked}
                  title={entry.label}
                  aria-label={entry.label}
                  className={`icon-btn ${active ? "icon-btn-active" : ""}`}
                >
                  {Icon ? <Icon /> : entry.label}
                </button>
              );
            })}
          </div>

          {/* Floating: color & brush bar (bottom-center) */}
          <div className="float-bar absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 p-1.5 pl-2.5">
            <div className="flex items-center gap-1">
              {PALETTE.map((paletteColor) => (
                <button
                  key={paletteColor}
                  type="button"
                  onClick={() => setColor(paletteColor)}
                  aria-label={`Pick ${paletteColor}`}
                  style={{ backgroundColor: paletteColor }}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    color === paletteColor
                      ? "scale-110 border-[var(--card-foreground)] shadow-[0_0_0_2px_rgba(253,123,65,0.4)]"
                      : "border-transparent hover:scale-105"
                  }`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="ml-1 h-6 w-6 cursor-pointer rounded-full border border-black/10 bg-white p-0"
              />
            </div>
            <div className="h-5 w-px bg-black/10" />
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={42}
                step={1}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-black/15 accent-[var(--accent-orange)]"
              />
              <span className="w-8 text-center text-[0.6rem] font-medium tabular-nums text-[var(--card-muted)]">
                {brushSize}px
              </span>
            </div>
          </div>

          {/* Floating: selection actions (appears when region selected) */}
          {hasSelection && !isCharadesMode && (
            <div className="float-bar absolute bottom-14 left-3 z-20 flex items-center gap-0.5 p-1">
              <button
                type="button"
                onClick={handleCopySelection}
                title="Copy"
                aria-label="Copy"
                className="icon-btn"
              >
                <IcCopy />
              </button>
              <button
                type="button"
                onClick={handlePasteSelection}
                disabled={!clipboardImage}
                title="Paste"
                aria-label="Paste"
                className="icon-btn"
              >
                <IcPaste />
              </button>
              <button
                type="button"
                onClick={handleFillSelection}
                title="Fill"
                aria-label="Fill"
                className="icon-btn"
              >
                <IcFill />
              </button>
              <button
                type="button"
                onClick={handleDeleteSelection}
                title="Delete"
                aria-label="Delete"
                className="icon-btn"
              >
                <IcDelete />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Charades side panel ---------- */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto xl:w-80">
        {/* Mode toggle */}
        <label className="float-bar flex cursor-pointer items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--card-foreground)]">
            Charades Mode
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isCharadesMode}
              onChange={(event) => setIsCharadesMode(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-black/10 transition-colors peer-checked:bg-[var(--accent-orange)]" />
            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </div>
        </label>

        {/* Instructions */}
        <div className="float-bar space-y-2 px-4 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--card-muted)]">
            How to play
          </p>
          <p className="text-sm leading-relaxed text-[var(--card-foreground)]">
            {CHARADES_INSTRUCTIONS}
          </p>
          <p className="text-[0.7rem] leading-relaxed text-[var(--card-muted)]">
            {CHARADES_INSTRUCTIONS_POSTSCRIPT}
          </p>
        </div>

        {/* Prompt generator */}
        <div className="float-bar space-y-3 px-4 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--card-muted)]">
            Prompt
          </p>
          <div className="flex gap-1.5">
            {CHARADES_DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider transition ${
                  selectedDifficulty === difficulty
                    ? "bg-[var(--accent-orange)] text-white shadow-[0_2px_8px_rgba(253,123,65,0.35)]"
                    : "bg-black/[0.04] text-[var(--card-muted)] hover:bg-black/[0.08] hover:text-[var(--card-foreground)]"
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleGeneratePrompt}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-orange)] px-3 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-[0_4px_14px_rgba(253,123,65,0.35)] transition hover:brightness-110 active:scale-[0.98]"
          >
            <IcSparkle />
            Generate
          </button>

          {/* Active prompt display */}
          <div
            className={`rounded-xl border px-4 py-3 text-center ${
              activePrompt
                ? "pulse-glow border-[var(--accent-orange)]/30 bg-[var(--accent-orange)]/[0.06]"
                : "border-black/[0.06] bg-black/[0.02]"
            }`}
          >
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--card-muted)]">
              Draw this
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--card-foreground)]">
              {activePrompt ? activePrompt.word : "\u2014"}
            </p>
            {activePromptAliases.length > 0 && (
              <p className="mt-1 text-[0.65rem] text-[var(--card-muted)]">
                Also accepts: {activePromptAliases.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Guess + Result */}
        <form onSubmit={handleGuess} className="float-bar space-y-3 px-4 py-3">
          <button
            type="submit"
            disabled={charadesDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--card-foreground)] px-4 py-3 text-sm font-semibold uppercase tracking-widest text-[var(--card-background)] shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {charadesButtonText}
          </button>

          <div className="flex items-center justify-between text-[0.65rem] text-[var(--card-muted)]">
            <span>{charadesGuessesLeftText}</span>
            {charadesCooldownText && (
              <span className="font-medium text-rose-500">
                {charadesCooldownText}
              </span>
            )}
          </div>

          {/* Result area */}
          <div className="min-h-[3rem]">
            {guessError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {guessError}
              </p>
            )}
            {guessResult && !guessError && (
              <p className="text-sm leading-relaxed text-[var(--card-foreground)]">
                {guessResult}
              </p>
            )}
            {roundStatus && (
              <p className="mt-2 rounded-lg border border-emerald-400/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {roundStatus}
              </p>
            )}
            {!guessError && !guessResult && (
              <p className="text-sm text-[var(--card-muted)]">
                AI guess appears here after you draw.
              </p>
            )}
          </div>
        </form>
      </aside>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Lab index page                                                    */
/* ------------------------------------------------------------------ */

export default function LabPage() {
  const [activeProject, setActiveProject] = useState<LabProjectId | "menu">(
    "menu",
  );

  if (activeProject === "paint-charades") {
    return (
      <main className="mx-auto flex min-h-screen w-full items-start justify-center bg-[var(--background)] px-4 py-5 sm:px-6">
        <section className="w-full max-w-[1600px]">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveProject("menu")}
              className="icon-btn !h-9 !w-9 rounded-full border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--card-foreground)] shadow-sm"
              aria-label="Back to Lab Index"
              title="Back to Lab Index"
            >
              <IcBack />
            </button>
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Paint + Charades
            </span>
          </div>
          <PaintCharadesProject />
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-16 sm:px-6">
      <div className="w-full max-w-3xl space-y-10 text-center">
        {/* Header */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-orange)]">
            Lab
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Experiments
          </h1>
          <p className="mx-auto max-w-md text-base text-[var(--muted)]">
            A playground for interactive projects and creative prototypes.
          </p>
        </div>

        {/* Project cards */}
        <div className="grid gap-5">
          {LAB_OPTIONS.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setActiveProject(project.id)}
              className="lift group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-left backdrop-blur-sm"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent-orange)]/10 blur-3xl transition-all duration-500 group-hover:bg-[var(--accent-orange)]/20 group-hover:blur-2xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-orange)]/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-orange)]">
                    <IcPaint />
                    {project.tag}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                    {project.title}
                  </h2>
                  <p className="max-w-lg text-sm leading-relaxed text-[var(--muted)]">
                    {project.description}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-widest text-[var(--foreground)] transition group-hover:border-[var(--accent-orange)]/40 group-hover:bg-[var(--accent-orange)] group-hover:text-white group-hover:shadow-[0_4px_20px_rgba(253,123,65,0.4)]">
                    {project.action}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--accent-orange)]"
        >
          <IcBack />
          Back to home
        </Link>
      </div>
    </main>
  );
}
