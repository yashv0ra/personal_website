import { extractResponseText, type OpenAIResponse } from "@/lib/openai";
import { NextResponse } from "next/server";

type VisionRateState = {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
};

type VisionRateStateWithCooldown = VisionRateState & {
  cooldownMs: number | null;
};

const DEFAULT_VISION_MODEL = "gpt-4.1-mini";
const DEFAULT_DAILY_GUESS_LIMIT = 30;
const DEFAULT_GUESS_COOLDOWN_MS = 10_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type CharadesUsageState = {
  dailyWindowStart: number;
  guessCount: number;
  lastGuessAt: number;
};

const charadesUsage = new Map<string, CharadesUsageState>();

type VisionUsage = {
  promptTokens: number | null;
  totalTokens: number | null;
};

type VisionResponse = {
  model: string;
  guess: string;
  usage: VisionUsage;
  rateLimit: VisionRateState;
  localRateLimit: VisionRateStateWithCooldown;
};

type VisionErrorResponse = {
  message: string;
  rateLimit: VisionRateState;
  localRateLimit: VisionRateStateWithCooldown;
};

type VisionRequestBody = {
  imageDataUrl?: string;
};

const rateLimitMessage = "Vision model rate limit reached. Please retry in a short while.";
const noRateHeaders: VisionRateState = { limit: null, remaining: null, resetAt: null };

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getVisionModelQuotaConfig() {
  return {
    dailyLimit: parsePositiveInteger(process.env.VISION_GUESS_DAILY_LIMIT, DEFAULT_DAILY_GUESS_LIMIT),
    cooldownMs: parsePositiveInteger(process.env.VISION_GUESS_MIN_INTERVAL_MS, DEFAULT_GUESS_COOLDOWN_MS),
  };
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function getDailyWindowStart(ts: number): number {
  return Math.floor(ts / ONE_DAY_MS) * ONE_DAY_MS;
}

function getClientUsageState(clientKey: string, ts: number): CharadesUsageState {
  const dailyWindowStart = getDailyWindowStart(ts);
  const existing = charadesUsage.get(clientKey);

  if (!existing || existing.dailyWindowStart !== dailyWindowStart) {
    const next: CharadesUsageState = {
      dailyWindowStart,
      guessCount: 0,
      lastGuessAt: 0,
    };
    charadesUsage.set(clientKey, next);
    return next;
  }

  return existing;
}

function makeLocalRateLimit(
  usage: CharadesUsageState,
  limit: number,
  cooldownMs: number,
  now: number,
): VisionRateStateWithCooldown {
  const remaining = Math.max(0, limit - usage.guessCount);
  const resetAt = new Date(usage.dailyWindowStart + ONE_DAY_MS).toISOString();
  const remainingCooldown = Math.max(0, cooldownMs - (now - usage.lastGuessAt));
  return {
    limit,
    remaining,
    resetAt,
    cooldownMs: usage.lastGuessAt === 0 ? 0 : remainingCooldown,
  };
}

function recordSuccessfulGuess(usage: CharadesUsageState, now: number): void {
  usage.guessCount += 1;
  usage.lastGuessAt = now;
}

function getLocalRateState(
  request: Request,
  now: number,
): { usage: CharadesUsageState; limit: number; cooldownMs: number; localRateLimit: VisionRateStateWithCooldown } {
  const { dailyLimit, cooldownMs } = getVisionModelQuotaConfig();
  const clientKey = getClientKey(request);
  const usage = getClientUsageState(clientKey, now);
  const localRateLimit = makeLocalRateLimit(usage, dailyLimit, cooldownMs, now);
  return {
    usage,
    limit: dailyLimit,
    cooldownMs,
    localRateLimit,
  };
}

function localLimitBlocked(
  request: Request,
  now: number,
): { response: VisionErrorResponse | null; usageState: CharadesUsageState; cooldownMs: number; limit: number } {
  const { usage, limit, cooldownMs, localRateLimit } = getLocalRateState(request, now);
  if (localRateLimit.cooldownMs && localRateLimit.cooldownMs > 0) {
    return {
      response: {
        message: `Too many requests. Please wait ${Math.ceil(localRateLimit.cooldownMs / 1000)} seconds before guessing again.`,
        rateLimit: noRateHeaders,
        localRateLimit,
      },
      usageState: usage,
      cooldownMs,
      limit,
    };
  }

  if ((localRateLimit.remaining ?? 0) <= 0) {
    return {
      response: {
        message: `Daily charades limit reached. You have used ${limit} guesses this cycle. It resets at ${localRateLimit.resetAt}.`,
        rateLimit: noRateHeaders,
        localRateLimit,
      },
      usageState: usage,
      cooldownMs,
      limit,
    };
  }

  return {
    response: null,
    usageState: usage,
    cooldownMs,
    limit,
  };
}

function parseIntHeader(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function looksLikeRateLimitError(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const maybeStatus = (payload as { error?: { status?: string; code?: string; message?: string } }).error;
  if (!maybeStatus) {
    return false;
  }
  const status = `${maybeStatus.status ?? ""} ${maybeStatus.code ?? ""} ${maybeStatus.message ?? ""}`.toLowerCase();
  return status.includes("rate") || status.includes("quota") || status.includes("billing");
}

function parseRateLimitInfo(headers: Headers): VisionRateState {
  const limit =
    parseIntHeader(headers.get("x-ratelimit-limit-requests")) ??
    parseIntHeader(headers.get("x-ratelimit-limit")) ??
    parseIntHeader(headers.get("x-ratelimit-limit-tokens")) ??
    null;
  const remaining =
    parseIntHeader(headers.get("x-ratelimit-remaining-requests")) ??
    parseIntHeader(headers.get("x-ratelimit-remaining")) ??
    parseIntHeader(headers.get("x-ratelimit-remaining-tokens")) ??
    null;
  const resetAt =
    headers.get("x-ratelimit-reset") ??
    headers.get("x-ratelimit-reset-requests") ??
    headers.get("retry-after");

  return {
    limit,
    remaining,
    resetAt,
  };
}

export async function POST(request: Request) {
  const requestNow = Date.now();
  const guard = localLimitBlocked(request, requestNow);
  if (guard.response) {
    return NextResponse.json(guard.response, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Missing OPENAI_API_KEY on the server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as VisionRequestBody;
  const imageDataUrl = body.imageDataUrl?.trim();
  if (!imageDataUrl) {
    return NextResponse.json(
      { message: "Image payload is required to make a guess." },
      { status: 400 }
    );
  }

  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(imageDataUrl)) {
    return NextResponse.json({ message: "Image payload must be a base64 PNG." }, { status: 400 });
  }
  const model = process.env.OPENAI_VISION_MODEL ?? DEFAULT_VISION_MODEL;
  const endpoint = "https://api.openai.com/v1/responses";

  const prompt =
    "You are a game judge for a charades-style sketch game. " +
    "Look at the drawing and return one concise guess of what is most likely being drawn. " +
    "Include a short confidence score as a percentage in the same line, formatted like: 'Guess: <item> (Confidence: <percent>%)'.";
  const providerPayload = {
    model,
    store: false,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: imageDataUrl, detail: "auto" },
      ],
    }],
    temperature: 0.35,
    max_output_tokens: 100,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(providerPayload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    const localRateLimit = makeLocalRateLimit(guard.usageState, guard.limit, guard.cooldownMs, Date.now());
    return NextResponse.json(
      {
        message: "Unable to reach the vision provider right now.",
        rateLimit: noRateHeaders,
        localRateLimit,
      },
      { status: 502 }
    );
  }

  const rateLimitInfo = parseRateLimitInfo(response.headers);
  if (!response.ok) {
    const rawText = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(rawText) as object;
    } catch {
      parsed = null;
    }

    const isRateLimitError = response.status === 429 || looksLikeRateLimitError(parsed);
    if (isRateLimitError) {
      const localRateLimit = makeLocalRateLimit(guard.usageState, guard.limit, guard.cooldownMs, Date.now());
      return NextResponse.json(
        {
          message: rateLimitMessage,
          rateLimit: rateLimitInfo,
          localRateLimit,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        message: `OpenAI vision request failed with status ${response.status}.`,
        rateLimit: rateLimitInfo,
        localRateLimit: makeLocalRateLimit(guard.usageState, guard.limit, guard.cooldownMs, Date.now()),
      },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as OpenAIResponse;
  const guess = extractResponseText(payload);
  if (!guess) {
    return NextResponse.json(
      {
        message: "The model returned no readable guess.",
        rateLimit: rateLimitInfo,
        localRateLimit: makeLocalRateLimit(guard.usageState, guard.limit, guard.cooldownMs, Date.now()),
      },
      { status: 502 }
    );
  }

  const usage: VisionUsage = {
    promptTokens: payload.usage?.input_tokens ?? null,
    totalTokens: payload.usage?.total_tokens ?? null,
  };
  recordSuccessfulGuess(guard.usageState, Date.now());
  const localRateLimit = makeLocalRateLimit(guard.usageState, guard.limit, guard.cooldownMs, Date.now());
  return NextResponse.json<VisionResponse>({
    model,
    guess,
    usage,
    rateLimit: rateLimitInfo,
    localRateLimit,
  });
}
