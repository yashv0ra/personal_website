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
const TOOL_OPTIONS: Array<{ value: ToolName; label: string; description: string }> = [
  { value: "brush", label: "Brush", description: "Freehand sketch" },
  { value: "eraser", label: "Eraser", description: "Paint over with background" },
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
  "You are playing charades against an LLM. Try your best to draw whatever you would like and hit Guess when you are ready for an LLM to grade your work!";
const CHARADES_INSTRUCTIONS_POSTSCRIPT =
  "PS: I have some restrictions on how often you can press the button due to API costs, so try not to press it too much!";

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
      const substitutions = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
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

function guessMatchesPrompt(guess: string, prompt: CharadesPrompt | null): boolean {
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
    targets.some((target) => isTokenCloseMatch(normalizeToken(token), target)),
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
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? "#ffffff",
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
  ctx.strokeRect(safeRect.x + 0.5, safeRect.y + 0.5, safeRect.width, safeRect.height);
  ctx.setLineDash([]);
}

function rateText(rateData: VisionRateState): string {
  if (!rateData.limit && !rateData.remaining && !rateData.resetAt) {
    return "Rate data unavailable";
  }
  if (rateData.remaining != null && rateData.limit != null) {
    const resetText = rateData.resetAt ? ` • reset: ${rateData.resetAt}` : "";
    return `${rateData.remaining}/${rateData.limit} requests remaining${resetText}`;
  }
  const resetText = rateData.resetAt ? ` • reset: ${rateData.resetAt}` : "";
  return rateData.remaining != null
    ? `~${rateData.remaining} requests remaining${resetText}`
    : `Monitoring rate headers${resetText}`;
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
) => ({ limit, remaining, resetAt: null, cooldownMs: 0 } as VisionRateStateWithCooldown);

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

function PaintCharadesProject() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolName>("brush");
  const [color, setColor] = useState("#1f2937");
  const [brushSize, setBrushSize] = useState(8);
  const [isCharadesMode, setIsCharadesMode] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const [activeSelection, setActiveSelection] = useState<RectRegion | null>(null);
  const [clipboardImage, setClipboardImage] = useState<ImageData | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);
  const [guessError, setGuessError] = useState("");
  const [guessResult, setGuessResult] = useState("");
  const [rateState, setRateState] = useState<VisionRateState>({
    limit: null,
    remaining: null,
    resetAt: null,
  });
  const [localRateState, setLocalRateState] = useState<VisionRateStateWithCooldown>(defaultRateState());
  const [tokenUsage, setTokenUsage] = useState({
    prompt: 0,
    total: 0,
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<CharadesDifficulty>("easy");
  const [activePrompt, setActivePrompt] = useState<CharadesPrompt | null>(null);
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
    let nextPrompt = pool[Math.floor(Math.random() * pool.length)] ?? null;
    if (!nextPrompt) {
      return;
    }

    if (pool.length > 1 && currentWord && nextPrompt.word === currentWord) {
      const index = pool.findIndex((entry) => entry.word === currentWord);
      const nextIndex = index >= 0 ? (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length : 0;
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
    if (!pointerDownRef.current || !toolStartRef.current || !canvasRef.current) {
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
      ctx.strokeRect(toolStartRef.current.x, toolStartRef.current.y, currentWidth, currentHeight);
    } else if (tool === "circle") {
      const radiusX = Math.abs(point.x - toolStartRef.current.x);
      const radiusY = Math.abs(point.y - toolStartRef.current.y);
      const radius = Math.max(2, Math.max(radiusX, radiusY));
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.arc(toolStartRef.current.x, toolStartRef.current.y, radius, 0, Math.PI * 2);
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
          safeRegion.height
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
      const hasMovement = Math.abs(region.width) > 0 || Math.abs(region.height) > 0;
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
        setRedoHistory((previous) => [last, ...previous].slice(0, MAX_HISTORY));
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
    setClipboardImage(ctx.getImageData(rect.x, rect.y, rect.width, rect.height));
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
    const maxX = Math.max(0, Math.min(CANVAS_WIDTH - clipboardImage.width, x));
    const maxY = Math.max(0, Math.min(CANVAS_HEIGHT - clipboardImage.height, y));
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
      localRateState.limit == null || localRateState.remaining == null || localRateState.remaining > 0;
    if (!canvas || isGuessing) {
      return;
    }
    if (roundWon) {
      setGuessError("Round complete. Press Clear to reset the canvas before guessing again.");
      return;
    }
    if (cooldownMs > 0) {
      setGuessError(`Please wait ${Math.ceil(cooldownMs / 1000)} seconds before guessing again.`);
      return;
    }
    if (!hasRemainingGuesses) {
      setGuessError(
        `Daily charades limit reached. Try again at ${localRateState.resetAt ?? "your next reset time"}.`
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
        setGuessError(result.message ?? "Could not process your request right now.");
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

  const hasSelection = Boolean(activeSelection && activeSelection.width > 0 && activeSelection.height > 0);
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
    if (!activeSelection || activeSelection.width <= 0 || activeSelection.height <= 0) {
      return;
    }
    drawSelectOutline(overlay, activeSelection, "#3b82f6");
  }, [activeSelection]);

  const charadesCooldownMs = localRateState.cooldownMs ?? 0;
  const hasRemainingGuesses =
    localRateState.limit == null || localRateState.remaining == null || localRateState.remaining > 0;
  const charadesGuessesLeftText =
    localRateState.limit !== null && localRateState.remaining !== null
      ? `${localRateState.remaining}/${localRateState.limit} guesses left`
      : "Loading rate budget...";
  const charadesCooldownText =
    charadesCooldownMs > 0
      ? `Next guess in ${Math.ceil(charadesCooldownMs / 1000)}s`
      : null;
  const charadesDisabled = roundWon || isGuessing || charadesCooldownMs > 0 || !hasRemainingGuesses;
  const toolDescription = TOOL_OPTIONS.find((entry) => entry.value === tool)?.description ?? "";
  const charadesButtonText = roundWon
    ? "Reset canvas first"
    : isGuessing
      ? "Guessing..."
      : !hasRemainingGuesses
        ? "Daily limit reached"
        : charadesDisabled
          ? "Please wait..."
          : "Guess";
  const activePromptAliases = activePrompt ? activePrompt.aliases.slice(0, 2) : [];

  return (
    <section className="h-[calc(100svh-7rem)]">
      {confettiPieces.length > 0 ? (
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
      ) : null}

      <div className="mb-3 grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-3">
          <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">
            Charades Instructions
          </p>
          <p className="mt-2 text-sm text-[var(--card-foreground)]">{CHARADES_INSTRUCTIONS}</p>
          <p className="mt-2 text-xs text-[var(--card-muted)]">{CHARADES_INSTRUCTIONS_POSTSCRIPT}</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-3">
          <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">
            Prompt Generator
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CHARADES_DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`rounded-lg border px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] transition sm:text-[0.7rem] ${
                  selectedDifficulty === difficulty
                    ? "border-[var(--card-foreground)] bg-[var(--card-foreground)] text-[var(--card-background)]"
                    : "border-[var(--card-border)] text-[var(--card-muted)] hover:border-[var(--card-foreground)] hover:text-[var(--card-foreground)]"
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleGeneratePrompt}
            className="w-full rounded-xl border border-[var(--accent-orange)] bg-[var(--accent-orange)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-95"
          >
            Generate One-Word Prompt
          </button>
          <div className="rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-center">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">Draw this</p>
            <p className="mt-1 text-xl font-semibold uppercase tracking-[0.06em] text-[var(--card-foreground)]">
              {activePrompt ? activePrompt.word : "No prompt yet"}
            </p>
            {activePromptAliases.length > 0 ? (
              <p className="mt-1 text-[0.65rem] text-[var(--card-muted)]">
                Close words: {activePromptAliases.join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid h-full gap-3 xl:grid-cols-[250px_1fr]">
        <aside className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-3">
          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] px-2 py-2">
              <span className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">
                Charades mode
              </span>
              <input
                type="checkbox"
                checked={isCharadesMode}
                onChange={(event) => setIsCharadesMode(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--accent-orange)]"
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">Tools</p>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_OPTIONS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => {
                    if (!isToolLocked(entry.value)) {
                      setTool(entry.value);
                    }
                  }}
                  disabled={isToolLocked(entry.value)}
                  title={entry.label}
                  aria-label={entry.label}
                  className={`rounded-lg border px-2 py-2 text-left text-[0.62rem] font-semibold uppercase tracking-[0.12em] transition sm:text-[0.7rem] disabled:cursor-not-allowed disabled:opacity-45 ${
                    tool === entry.value
                      ? "border-[var(--card-foreground)] bg-[var(--card-foreground)] text-[var(--card-background)]"
                      : "border-[var(--card-border)] bg-[var(--card-background)] text-[var(--card-muted)] hover:border-[var(--card-foreground)] hover:text-[var(--card-foreground)]"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">Color</p>
            <div className="grid grid-cols-5 gap-2">
              {PALETTE.map((paletteColor) => (
                <button
                  key={paletteColor}
                  type="button"
                  onClick={() => setColor(paletteColor)}
                  aria-label={`Pick ${paletteColor}`}
                  style={{ backgroundColor: paletteColor }}
                  className={`h-8 w-full rounded-md border ${
                    color === paletteColor
                      ? "border-[var(--card-foreground)] ring-2 ring-[var(--card-foreground)]/40"
                      : "border-[var(--card-border)]"
                  }`}
                />
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[0.66rem] text-[var(--card-muted)]">
              <span className="font-semibold uppercase tracking-[0.12em]">Picker</span>
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-8 w-9 cursor-pointer rounded border border-[var(--card-border)] bg-white p-0"
              />
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">Brush</p>
            <input
              type="range"
              min={1}
              max={42}
              step={1}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--card-border)]"
            />
            <p className="text-[0.65rem] text-[var(--card-muted)]">{brushSize}px</p>
          </div>
          <div className="space-y-2">
            <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-[var(--card-muted)]">Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)]"
                disabled={history.length <= 1}
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleRedo}
                title="Redo"
                aria-label="Redo"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)]"
                disabled={redoHistory.length === 0}
              >
                Redo
              </button>
              <button
                type="button"
                onClick={handleClearCanvas}
                title="Clear canvas"
                aria-label="Clear canvas"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveImage}
                title="Save drawing"
                aria-label="Save drawing"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)]"
              >
                Save
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopySelection}
                disabled={isCharadesMode || !hasSelection}
                title="Copy selected area"
                aria-label="Copy selected area"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)] disabled:opacity-40"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handlePasteSelection}
                disabled={isCharadesMode || !clipboardImage}
                title="Paste"
                aria-label="Paste"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)] disabled:opacity-40"
              >
                Paste
              </button>
              <button
                type="button"
                onClick={handleFillSelection}
                disabled={isCharadesMode || !hasSelection}
                title="Fill selected area"
                aria-label="Fill selected area"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)] disabled:opacity-40"
              >
                Fill region
              </button>
              <button
                type="button"
                onClick={handleDeleteSelection}
                disabled={!hasSelection}
                title="Delete selected area"
                aria-label="Delete selected area"
                className="rounded-lg border border-[var(--card-border)] px-2 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--card-foreground)] transition hover:border-[var(--card-foreground)] disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </aside>

        <div className="grid min-h-0 grid-rows-[1fr_auto] gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white">
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-[var(--card-background)] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--card-muted)]">
              {toolDescription}
            </div>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="h-full w-full touch-none rounded-2xl"
            />
            <canvas
              ref={overlayRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="pointer-events-none absolute inset-0 z-10 h-full w-full rounded-2xl"
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
            <form
              onSubmit={handleGuess}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-3"
            >
              <button
                type="submit"
                disabled={charadesDisabled}
                className="inline-flex w-full justify-center rounded-xl border border-[var(--accent-orange)] bg-[var(--accent-orange)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {charadesButtonText}
              </button>

              <p className="mt-2 text-[0.7rem] text-[var(--card-muted)]">{charadesGuessesLeftText}</p>
              {localRateState.resetAt ? (
                <p className="mt-1 text-[0.65rem] text-[var(--card-muted)]">Budget resets at {localRateState.resetAt}</p>
              ) : null}
              {charadesCooldownText ? (
                <p className="mt-1 text-[0.65rem] text-rose-600">{charadesCooldownText}</p>
              ) : null}
            </form>

            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-3">
              <p className="text-[0.67rem] font-semibold uppercase tracking-[0.12em] text-[var(--card-muted)]">Result</p>
              {guessError ? <p className="mt-2 text-sm text-rose-600">{guessError}</p> : null}
              {guessResult ? <p className="mt-2 text-sm text-[var(--card-foreground)]">{guessResult}</p> : null}
              {roundStatus ? (
                <p className="mt-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-2 text-sm text-emerald-700">
                  {roundStatus}
                </p>
              ) : null}
              {!guessError && !guessResult ? (
                <p className="mt-2 text-sm text-[var(--card-muted)]">Guess shows here after you draw.</p>
              ) : null}
              <div className="mt-3 grid gap-1 text-[0.65rem] text-[var(--card-muted)]">
                <p>Requests: {rateText(rateState)}</p>
                <p>
                  Tokens: {tokenUsage.prompt || 0} prompt, {tokenUsage.total || 0} total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes lab-confetti-fall {
          0% {
            transform: translate3d(0, -8vh, 0) rotate(0deg);
          }
          100% {
            transform: translate3d(var(--confetti-drift), 112vh, 0) rotate(760deg);
          }
        }
      `}</style>
    </section>
  );
}

export default function LabPage() {
  const [activeProject, setActiveProject] = useState<LabProjectId | "menu">("menu");

  if (activeProject === "paint-charades") {
    return (
      <main className="mx-auto flex min-h-screen w-full items-start justify-center px-4 py-6 sm:px-6">
        <section className="w-full max-w-[1600px]">
          <div className="mb-4 flex justify-start">
            <button
              type="button"
              onClick={() => setActiveProject("menu")}
              className="rounded-full border border-[var(--card-border)] bg-[var(--card-background)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--card-foreground)]"
            >
              Back to Lab Index
            </button>
          </div>
          <PaintCharadesProject />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-start px-4 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-[rgba(221,220,219,0.35)] bg-[rgba(255,255,255,0.06)] p-7 text-[var(--foreground)] shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-peach)]">
          Lab Index
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
          Pick an experiment from the list below to enter.
        </p>

        <ul className="mt-8 grid gap-4">
          {LAB_OPTIONS.map((project) => (
            <li
              key={project.id}
              className="rounded-2xl border border-[rgba(221,220,219,0.35)] bg-[rgba(255,255,255,0.06)] p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="inline-flex rounded-full border border-[rgba(253,123,65,0.5)] bg-[rgba(253,123,65,0.15)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-peach)]">
                    {project.tag}
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h2>
                  <p className="max-w-2xl text-sm text-[var(--muted)] sm:text-base">
                    {project.description}
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveProject(project.id)}
                    className="rounded-full border border-[var(--card-border)] bg-[var(--card-background)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--card-foreground)] transition hover:scale-[1.02] hover:border-[var(--card-foreground)]"
                  >
                    {project.action}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
