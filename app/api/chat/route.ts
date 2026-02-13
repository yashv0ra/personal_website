import { NextResponse } from "next/server";
import { buildResumeContext, resume } from "@/lib/resume";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const primarySystemPrompt = `ROLE
You are the AI assistant for Yash Vora's personal website. Your audience is recruiters, hiring managers, and collaborators.

PRIMARY OBJECTIVE
Show why Yash is a strong candidate by connecting his experiences to transferable skills and measurable impact.

INSTRUCTION PRIORITY
1) Use the resume context, supplemental facts, and query-relevant facts as the source of truth.
2) If a detail appears in any provided context, state it confidently.
3) If a detail is not present in any provided context, explicitly say you do not have that detail.
4) Do not fabricate names, courses, employers, outcomes, timelines, or credentials.
5) Never produce contradictory statements such as saying you lack a detail and then providing it.

CANDIDATE PROFILE
- Purdue senior graduating in 2026.
- Studies Integrated Business & Engineering (IBE); profile combines engineering execution, product thinking, and leadership.
- Psychology background informs user behavior, learning, and communication.
- Works well in ambiguous, cross-functional environments and emphasizes quality and iteration.

SUPPLEMENTAL FACTS: PROJECTS AND EXPERIENCE
- Apple internship: built process/system improvements that increased throughput across SWE programs, managed feature-set execution, and coordinated across large teams.
- Hyphen internship: built an automated 12-motor burn-in reliability test with CAD hardware setup, multithreaded software, NFC traceability, and Excel reporting.
- SpeechAgent (buildspace nights/weekends 2024): independent speech-to-speech AI project in Python using LangChain, Deepgram, and Groq.
- Java academic project: full-stack social media platform with accounts, friending, messaging, and edit/delete functionality.
- PAWS / VIP team: project-managed design and construction work for an animal shelter ramp with safety/usability constraints.
- 180 Degrees Consulting Purdue: led a consulting team for a local food bank project including Tableau and Excel improvements.
- AP Statistics policy change: as an IBE student representative, helped drive a permanent AP Statistics credit transfer change via evidence-based advocacy.
- NSSE @ Purdue: co-founded and scaled the organization; handled leadership conflict and built clearer accountability structures.

SUPPLEMENTAL FACTS: LEADERSHIP, VALUES, AND GOALS
- Leadership style is strategic and inclusive; seeks diverse input and optimizes for execution.
- Organization habits include calendar planning plus daily prioritized to-do lists.
- Strong interest in education/edtech and improving learning outcomes through systems thinking.
- Short-term goal: become a stronger product-oriented technical operator.
- Medium-term goal: build products at scale with strong mentorship and cross-functional teams.
- Long-term goal: help build durable, high-impact technology organizations.

SUPPLEMENTAL FACTS: PERSONAL TOPICS
- Badminton: played varsity all 4 years of high school and still plays casually.
- PAWS volunteering: part of Pets in Action With Shelters work.
- 3D Printing Business: started with his sister in middle/high school, selling figurines and commissions.
- Buildspace (SpeechAgent): independent nights-and-weekends project.
- Study Abroad in Australia: Sydney in Spring 2025; traveled to Cairns, New Zealand, Vietnam, and more.
- Orientation Team Leader: served as a Purdue BGR Team Leader.
- Piano: currently learning and excited to improve.
- Cursor/Codex: this website was built with Codex, and Yash has built other projects in Cursor.

ANSWERING GUIDELINES
- Always connect experience -> skill -> impact.
- For skill questions, synthesize from relevant evidence in experience, leadership, and skills context before saying anything is missing.
- If the asked skill appears in the provided skills or can be inferred from listed work, do not say you lack specific information.
- For leadership questions, use concrete examples from Apple, 180DC, NSSE, and student leadership.
- For Excel questions, reference 180DC Food Finders work and coursework context.
- For project questions, explain broader product, leadership, or systems-thinking relevance.
- Keep tone confident, professional, and direct.`;

const responseStylePrompt = `RESPONSE STYLE RULES
- Respond in plain text only (no markdown, headings, bullets, or numbered lists).
- Do not use markdown syntax like **bold**, *italics*, backticks, # headings, - bullets, 1. lists, or [links](url).
- Keep responses concise: 2 to 5 sentences total.
- Use only details grounded in the provided system prompt and resume context.
- If a specific detail is not available after attempting a reasonable evidence-based connection, say you do not have that detail.
- Avoid phrases like "I do not have specific information" when relevant evidence is present in context.`;

const resumeContext = buildResumeContext(resume);
const rateLimitMessage = "Temporary rate limit reached, please try again in a minute!";
const minResponseSentences = 2;
const maxResponseSentences = 5;
const sentenceFloorFallback =
  "I can share more detail on any specific experience or skill if helpful.";
const noInfoPattern =
  /\b(i do not|i don't|i have no)\b[\s\S]{0,100}\b(info(?:rmation)?|detail|context)\b/i;

type GroundingRule = {
  keywords: string[];
  fact: string;
  fallback: string;
};

type UserChatMessage = {
  role: "user";
  content: string;
};

type GroqErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

const queryGroundingRules: GroundingRule[] = [
  {
    keywords: ["apple", "epm", "engineering program manager", "swe programs"],
    fact: "Apple internship: Yash built process and system improvements that improved throughput across SWE programs, managed feature-set execution, and coordinated across large teams.",
    fallback:
      "At Apple, Yash built internal process improvements that increased throughput across SWE programs and managed execution across multiple feature sets.",
  },
  {
    keywords: ["hyphen", "12-motor", "burn-in", "nfc", "solidworks"],
    fact: "Hyphen internship: Yash built an automated 12-motor burn-in reliability test with CAD hardware setup, multithreaded software, NFC traceability, and Excel reporting.",
    fallback:
      "At Hyphen, Yash built an automated 12-motor burn-in reliability test using CAD, multithreaded software, NFC traceability, and Excel reporting.",
  },
  {
    keywords: ["speechagent", "buildspace", "deepgram", "groq", "langchain"],
    fact: "SpeechAgent: independent nights-and-weekends speech-to-speech AI project in Python using LangChain, Deepgram, and Groq.",
    fallback:
      "SpeechAgent was an independent nights-and-weekends project where Yash built a speech-to-speech AI system in Python with LangChain, Deepgram, and Groq.",
  },
  {
    keywords: ["java project", "social media platform", "friending", "messaging"],
    fact: "Java academic project: Yash built a full-stack social media platform with accounts, friending, messaging, and edit/delete functionality.",
    fallback:
      "Yash also built a full-stack Java social media platform with accounts, friending, messaging, and edit/delete functionality.",
  },
  {
    keywords: ["paws", "pets in action", "vip team", "animal shelter", "ramp"],
    fact: "PAWS and VIP team: Yash project-managed design and construction work for an animal shelter ramp with safety and usability constraints.",
    fallback:
      "Through PAWS and the VIP team, Yash project-managed animal shelter ramp work focused on safety and usability constraints.",
  },
  {
    keywords: ["180 degrees", "180dc", "food finders", "food bank", "tableau"],
    fact: "180 Degrees Consulting Purdue: Yash led a consulting team for a local food bank project with Tableau and Excel improvements.",
    fallback:
      "At 180 Degrees Consulting Purdue, Yash led a team delivering Tableau and Excel improvements for a local food bank project.",
  },
  {
    keywords: ["ap statistics", "credit transfer", "ibe representative"],
    fact: "AP Statistics policy change: as an IBE student representative, Yash helped drive a permanent AP Statistics credit transfer change through evidence-based advocacy.",
    fallback:
      "As an IBE student representative, Yash helped secure a permanent AP Statistics credit transfer policy change using evidence-based advocacy.",
  },
  {
    keywords: ["nsse", "national society of sales engineers", "co-founder"],
    fact: "NSSE at Purdue: Yash co-founded and scaled the organization, handled leadership conflict, and implemented clearer accountability structures.",
    fallback:
      "Yash co-founded and scaled NSSE at Purdue while resolving leadership conflicts and improving accountability.",
  },
  {
    keywords: ["stakeholder management", "stakeholder", "stakeholders"],
    fact: "Stakeholder management is an explicit business skill on Yash's resume. Supporting evidence includes coordinating 20+ programs and tracking blockers across 180+ personnel at Apple, plus cross-team execution work in leadership and consulting roles.",
    fallback:
      "Stakeholder management is one of Yash's explicit business skills, backed by Apple work coordinating 20+ programs and 180+ personnel, along with cross-team leadership in consulting and student organizations.",
  },
  {
    keywords: ["client management", "client relationships", "clients"],
    fact: "Client management is an explicit business skill on Yash's resume. Supporting evidence includes leading a 180 Degrees Consulting Purdue project with client coordination, deadline ownership, and relationship management.",
    fallback:
      "Client management is an explicit skill for Yash, with direct evidence from leading a 180 Degrees Consulting Purdue project that required client coordination and relationship management.",
  },
  {
    keywords: ["conflict resolution", "resolve conflicts", "resolving conflicts"],
    fact: "Conflict resolution is an explicit business skill on Yash's resume, with evidence from leading teams, managing stakeholder tensions, and resolving conflicts in consulting and student leadership settings.",
    fallback:
      "Conflict resolution is one of Yash's listed business skills, supported by team leadership experience that required managing tensions and resolving execution conflicts.",
  },
  {
    keywords: ["excel", "spreadsheet"],
    fact: "Excel is an explicit business skill on Yash's resume, with concrete usage in 180 Degrees Consulting Purdue work and internship workflows.",
    fallback:
      "Excel is a core listed business skill for Yash, with practical use in consulting deliverables and internship reporting workflows.",
  },
  {
    keywords: ["tableau"],
    fact: "Tableau is an explicit business skill on Yash's resume and was used in 180 Degrees Consulting Purdue work for a local food bank engagement.",
    fallback:
      "Tableau is one of Yash's listed skills and was applied directly in the 180 Degrees Consulting Purdue project work.",
  },
  {
    keywords: ["salesforce", "crm"],
    fact: "Salesforce CRM is an explicit business skill on Yash's resume, with application in internship work including sales process support and lead generation workflows.",
    fallback:
      "Salesforce CRM is a listed business skill for Yash, with practical use in internship sales process and lead-generation work.",
  },
  {
    keywords: ["leadership style", "how does yash lead", "strategic and inclusive"],
    fact: "Leadership style: strategic and inclusive, with a focus on diverse input and strong execution.",
    fallback:
      "Yash describes his leadership style as strategic and inclusive, combining diverse input with disciplined execution.",
  },
  {
    keywords: ["organization habits", "productivity", "calendar planning", "to-do list"],
    fact: "Organization habits: Yash uses calendar planning and daily prioritized to-do lists.",
    fallback:
      "Yash stays organized through calendar planning and daily prioritized to-do lists.",
  },
  {
    keywords: ["edtech", "education technology", "learning outcomes"],
    fact: "Interest area: Yash is strongly interested in education and edtech, especially improving learning outcomes through systems thinking.",
    fallback:
      "Yash has a strong long-term interest in education and edtech, especially improving learning outcomes with systems thinking.",
  },
  {
    keywords: ["short-term goal", "short term goal"],
    fact: "Short-term goal: become a stronger product-oriented technical operator.",
    fallback:
      "Yash's short-term goal is to become a stronger product-oriented technical operator.",
  },
  {
    keywords: ["medium-term goal", "medium term goal"],
    fact: "Medium-term goal: build products at scale with strong mentorship and cross-functional teams.",
    fallback:
      "Yash's medium-term goal is to build products at scale while learning in strong cross-functional teams.",
  },
  {
    keywords: ["long-term goal", "long term goal"],
    fact: "Long-term goal: help build durable, high-impact technology organizations.",
    fallback:
      "Yash's long-term goal is to help build durable, high-impact technology organizations.",
  },
  {
    keywords: ["badminton"],
    fact: "Badminton: Yash played varsity badminton all four years in high school and still plays casually.",
    fallback:
      "Yash played varsity badminton for all four years of high school and still plays casually.",
  },
  {
    keywords: ["3d printing", "printing business", "figurines", "commissions", "sister"],
    fact: "3D printing business: Yash started a small figurine and commission business with his sister in middle and high school.",
    fallback:
      "Yash started a 3D-printing figurine and commissions business with his sister during middle and high school.",
  },
  {
    keywords: ["study abroad", "australia", "sydney", "cairns", "new zealand", "vietnam"],
    fact: "Study abroad: Yash studied in Sydney during Spring 2025 and traveled to Cairns, New Zealand, Vietnam, and other locations.",
    fallback:
      "Yash studied abroad in Sydney in Spring 2025 and traveled to places including Cairns, New Zealand, and Vietnam.",
  },
  {
    keywords: ["orientation", "bgr", "orientation team leader", "bgr team leader"],
    fact: "Orientation Team Leader: Yash served as a Purdue BGR Team Leader and helped onboard incoming students.",
    fallback:
      "Yash served as a Purdue BGR Team Leader, which is Purdue's Orientation Team Leader role focused on helping onboard incoming students.",
  },
  {
    keywords: ["piano"],
    fact: "Piano: Yash is currently learning piano and is excited to improve.",
    fallback:
      "Yash is currently learning piano and is actively working to improve.",
  },
  {
    keywords: ["cursor", "codex", "built this website"],
    fact: "Cursor and Codex: this website was built with Codex, and Yash has built other projects in Cursor.",
    fallback:
      "This website was built with Codex, and Yash has also built other projects in Cursor.",
  },
];

function getLatestUserMessage(messages: UserChatMessage[]): string {
  if (messages.length === 0) {
    return "";
  }

  return messages[messages.length - 1].content.trim();
}

function getMatchedGroundingRules(userMessage: string): GroundingRule[] {
  const normalized = userMessage.toLowerCase();
  if (!normalized) {
    return [];
  }

  return queryGroundingRules.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );
}

function buildQueryGroundingContext(matchedRules: GroundingRule[]): string {
  if (matchedRules.length === 0) {
    return "";
  }

  return `QUERY-RELEVANT FACTS (verified and safe to use)
Use these facts directly when relevant to the user question.
Do not claim missing information for any fact listed below.
${matchedRules.map((rule) => `- ${rule.fact}`).join("\n")}`;
}

function buildGroundedFallback(matchedRules: GroundingRule[]): string {
  if (matchedRules.length === 0) {
    return "";
  }

  return matchedRules
    .slice(0, 2)
    .map((rule) => rule.fallback)
    .join(" ");
}

function looksLikeRateLimitText(text: string): boolean {
  return /rate limit reached|rate_limit_exceeded|tokens per minute|\bTPM\b/i.test(
    text
  );
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRateLimitPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const error = (payload as GroqErrorPayload).error;
  if (!error) {
    return false;
  }

  const message = error.message ?? "";
  const type = error.type ?? "";
  const code = error.code ?? "";

  return (
    code === "rate_limit_exceeded" ||
    /rate[_ -]?limit|tokens?/i.test(type) ||
    looksLikeRateLimitText(message)
  );
}

function removeNoInfoClause(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }

  const cleaned = trimmed
    .replace(
      /^(?:i do not|i don't|i have no)\s+(?:specific\s+)?(?:information|details?|context)\s+about[^.?!;:]*[.?!;:]?\s*/i,
      ""
    )
    .replace(
      /^(?:while|although)\s+i\s+(?:do not|don't|have no)\s+(?:specific\s+)?(?:information|details?|context)\s+about[^,.;:]*[,.;:]\s*/i,
      ""
    )
    .replace(/^(?:however|but|that said)\s*,?\s*/i, "");

  if (!cleaned) {
    return trimmed;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) {
    return [];
  }

  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function sanitizeReply(text: string): string {
  const plainText = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/[*_`#>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    return "";
  }

  const sentences = splitIntoSentences(plainText);
  if (sentences.length === 0) {
    return plainText;
  }

  return sentences.slice(0, maxResponseSentences).join(" ");
}

function dropContradictoryNoInfoLead(text: string): string {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) {
    return text;
  }

  const [firstSentence, ...remainingSentences] = sentences;
  if (!noInfoPattern.test(firstSentence)) {
    return text;
  }

  return remainingSentences.join(" ");
}

function enforceSentenceBounds(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const sentences = splitIntoSentences(trimmed);
  if (sentences.length === 0) {
    return trimmed;
  }

  const bounded = sentences.slice(0, maxResponseSentences);
  while (bounded.length < minResponseSentences) {
    bounded.push(sentenceFloorFallback);
  }

  return bounded.join(" ");
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Missing GROQ_API_KEY on the server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { messages?: ChatMessage[] };
  const messages = body.messages ?? [];
  const userMessages = messages
    .filter((message): message is UserChatMessage => message.role === "user")
    .filter((message) => message.content.trim().length > 0)
    .slice(-10);
  const latestUserMessage = getLatestUserMessage(userMessages);
  const matchedGroundingRules = getMatchedGroundingRules(latestUserMessage);
  const queryGroundingContext = buildQueryGroundingContext(matchedGroundingRules);
  const groundedFallback = buildGroundedFallback(matchedGroundingRules);

  const systemMessages: ChatMessage[] = [
    {
      role: "system",
      content: primarySystemPrompt,
    },
    {
      role: "system",
      content: resumeContext,
    },
    {
      role: "system",
      content: responseStylePrompt,
    },
  ];
  if (queryGroundingContext) {
    systemMessages.push({
      role: "system",
      content: queryGroundingContext,
    });
  }

  const payload = {
    model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    temperature: 0,
    messages: [...systemMessages, ...userMessages],
  };

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach the LLM provider right now. Please try again." },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const rawErrorText = await response.text();
    const parsedError = parseJsonSafely(rawErrorText);
    const isRateLimitError =
      response.status === 429 ||
      looksLikeRateLimitText(rawErrorText) ||
      isRateLimitPayload(parsedError);

    if (isRateLimitError) {
      return NextResponse.json(
        { message: rateLimitMessage },
        { status: 429 }
      );
    }

    const errorText = rawErrorText.slice(0, 400).trim();
    return NextResponse.json(
      {
        message:
          errorText ||
          `LLM provider request failed with status ${response.status}.`,
      },
      { status: 502 }
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  if (isRateLimitPayload(data)) {
    return NextResponse.json({ message: rateLimitMessage }, { status: 429 });
  }
  const reply = data.choices?.[0]?.message?.content?.trim();
  let sanitizedReply = sanitizeReply(reply ?? "");
  sanitizedReply = removeNoInfoClause(sanitizedReply);
  sanitizedReply = dropContradictoryNoInfoLead(sanitizedReply);

  if (groundedFallback && noInfoPattern.test(sanitizedReply)) {
    sanitizedReply = groundedFallback;
  }
  sanitizedReply = enforceSentenceBounds(sanitizedReply);

  return NextResponse.json({ message: sanitizedReply });
}
