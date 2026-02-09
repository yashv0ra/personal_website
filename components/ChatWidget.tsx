"use client";

import { useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const suggestedQuestions = [
  "Why would Yash be a great product manager?",
  "Tell me more about Yash's Hyphen experience.",
];

type ChatWidgetVariant = "floating" | "panel";

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M3 11.8 20.8 4.2 13.2 22l-2.4-7.8L3 11.8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.8 14.2 20.8 4.2" strokeLinecap="round" />
    </svg>
  );
}

export default function ChatWidget({
  variant = "floating",
}: {
  variant?: ChatWidgetVariant;
}) {
  const [open, setOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showResumeNudge, setShowResumeNudge] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isFloating = variant === "floating";
  const isOpen = isFloating ? open : true;
  const containerClassName = "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3";
  const panelWidthClassName = isMinimized
    ? "w-[220px] sm:w-[240px]"
    : "w-[380px] sm:w-[420px]";
  const headerActionClassName =
    "rounded-full border border-white/45 bg-white/15 px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/25";

  const quickReplies = useMemo(() => {
    const asked = new Set(messages.map((message) => message.text));
    return suggestedQuestions.filter((question) => !asked.has(question));
  }, [messages]);

  function dismissResumeNudge() {
    setShowResumeNudge(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("resume-chat-nudge-dismissed", "1");
    }
  }

  useEffect(() => {
    if (variant !== "panel") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (window.sessionStorage.getItem("resume-chat-nudge-dismissed") === "1") {
      return;
    }
    const timer = window.setTimeout(() => {
      setShowResumeNudge(true);
    }, 12000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [variant]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    dismissResumeNudge();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as { message?: string };
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text:
          data.message ??
          "Thanks for the question! I can share more about Yash’s experience.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: "Sorry, I hit a snag connecting to the resume assistant.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={containerClassName}>
      {showResumeNudge && variant === "panel" ? (
        <div className="relative w-[320px] max-w-[88vw] rounded-2xl border border-[var(--accent-orange)]/55 bg-gradient-to-r from-[var(--accent-orange)] to-[#ffa574] px-4 py-3 pr-11 text-white shadow-[0_20px_60px_rgba(253,123,65,0.4)]">
          <p className="text-sm font-semibold">
            try talking with an LLM trained on my experience!
          </p>
          <button
            type="button"
            onClick={dismissResumeNudge}
            aria-label="Dismiss chat suggestion"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            x
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <div
          className={`overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--card-foreground)] shadow-[0_24px_80px_rgba(60,64,68,0.28)] ${
            showResumeNudge ? "ring-2 ring-[var(--accent-orange)]/65" : ""
          } ${
            panelWidthClassName
          }`}
        >
          <div
            className={`flex items-center justify-between bg-gradient-to-r from-[var(--accent-orange)] to-[#ffa574] px-4 py-3 ${
              isMinimized ? "" : "border-b border-[var(--accent-orange)]/40"
            }`}
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-white">
                Chat with resume
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissResumeNudge();
                  setIsMinimized((prev) => !prev);
                }}
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                className={headerActionClassName}
              >
                {isMinimized ? "+" : "-"}
              </button>
              {isFloating ? (
                <button
                  type="button"
                  onClick={() => {
                    dismissResumeNudge();
                    setIsMinimized(false);
                    setOpen(false);
                  }}
                  className={headerActionClassName}
                >
                  Close
                </button>
              ) : null}
            </div>
          </div>

          {isMinimized ? null : (
            <>
              <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-4 text-sm text-[var(--card-muted)]">
                {messages.length === 0 ? (
                  <p>
                    Ask a question about Yash’s experience, impact, and strengths.
                  </p>
                ) : null}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl px-3 py-2 ${
                      message.role === "user"
                        ? "ml-auto bg-[var(--accent-orange)]/20 text-[var(--card-foreground)]"
                        : "mr-auto bg-white/70 text-[var(--accent-charcoal)]"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
                {isLoading ? (
                  <div className="mr-auto rounded-2xl bg-white/70 px-3 py-2 text-[var(--accent-charcoal)]">
                    Thinking…
                  </div>
                ) : null}
              </div>

              {quickReplies.length ? (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {quickReplies.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      className="rounded-full border border-[var(--card-border)] bg-white/80 px-3 py-1 text-sm text-[var(--card-muted)] hover:border-[var(--accent-orange)]/45 hover:bg-[var(--accent-orange)]/20"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                className="flex items-center gap-2 border-t border-[var(--card-border)] px-4 py-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage(input);
                }}
              >
                <input
                  value={input}
                  onChange={(event) => {
                    if (!input && event.target.value) {
                      dismissResumeNudge();
                    }
                    setInput(event.target.value);
                  }}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-full border border-[var(--card-border)] bg-white/80 px-3 py-2 text-sm text-[var(--accent-charcoal)] placeholder:text-[var(--accent-charcoal)]/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-label="Send message"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-orange)] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <SendIcon />
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}

      {isFloating ? (
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setOpen(false);
              return;
            }
            setIsMinimized(false);
            setOpen(true);
          }}
          aria-label={isOpen ? "Close chat" : "Open chat"}
          className="group flex h-12 w-12 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--card-foreground)] shadow-[0_18px_60px_rgba(60,64,68,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(60,64,68,0.32)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path
              d="M12 3.5a8.5 8.5 0 0 1 7.7 12.3A8.5 8.5 0 0 1 12 20.5H7.5L4 23v-4.5A8.5 8.5 0 0 1 12 3.5Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="15.5" cy="12" r="1" fill="currentColor" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
