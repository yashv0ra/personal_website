import { NextResponse } from "next/server";
import { buildResumeContext, resume } from "@/lib/resume";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const resumeContext = buildResumeContext(resume);

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
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "You are a concise assistant answering questions about Yash Vora's resume. Respond in plain text only (no markdown, no bullets). Keep replies under 3 sentences. Use only the provided resume context. If unsure, say you don't have that detail.",
      },
      {
        role: "system",
        content: resumeContext,
      },
      ...messages,
    ],
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Groq request failed." },
      { status: 500 }
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = data.choices?.[0]?.message?.content?.trim();

  return NextResponse.json({ message: reply ?? "" });
}
