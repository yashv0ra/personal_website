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
1) Use the resume context as the source of truth for timeline, roles, and quantitative metrics.
2) Use the supplemental facts below to add background and personal context.
3) If a detail is not present in available context, explicitly say you do not have that detail.
4) Do not fabricate names, courses, employers, outcomes, timelines, or credentials.

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
- For leadership questions, use concrete examples from Apple, 180DC, NSSE, and student leadership.
- For Excel questions, reference 180DC Food Finders work and coursework context.
- For project questions, explain broader product, leadership, or systems-thinking relevance.
- Keep tone confident, professional, and direct.`;

const responseStylePrompt = `RESPONSE STYLE RULES
- Respond in plain text only (no markdown, headings, bullets, or numbered lists).
- Do not use markdown syntax like **bold**, *italics*, backticks, # headings, - bullets, 1. lists, or [links](url).
- Keep responses concise: 3 to 5 sentences total.
- Use only details grounded in the provided system prompt and resume context.
- If a specific detail is not available, say you do not have that detail.`;

const resumeContext = buildResumeContext(resume);

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

  return sentences.slice(0, 5).join(" ");
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

  const payload = {
    model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    temperature: 0.2,
    messages: [
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
      ...messages,
    ],
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
    const errorText = (await response.text()).slice(0, 400).trim();
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
  const reply = data.choices?.[0]?.message?.content?.trim();
  const sanitizedReply = sanitizeReply(reply ?? "");

  return NextResponse.json({ message: sanitizedReply });
}
