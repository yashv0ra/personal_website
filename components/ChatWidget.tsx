"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RESUME_PILL_SELECT_EVENT, type ResumePillSelectDetail } from "@/lib/chatEvents";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isFloating = variant === "floating";
  const isOpen = isFloating ? open : true;
  const containerClassName =
    "fixed bottom-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6 sm:max-w-none";
  const panelWidthClassName = isMinimized
    ? "w-[min(calc(100vw-1.5rem),240px)] sm:w-[240px]"
    : "w-[min(calc(100vw-1.5rem),420px)] sm:w-[420px]";
  const headerActionClassName =
    "rounded-full border border-white/45 bg-white/15 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/25 sm:text-xs sm:tracking-[0.16em]";

  const quickReplies = useMemo(() => {
    const asked = new Set(messages.map((message) => message.text));
    return suggestedQuestions.filter((question) => !asked.has(question));
  }, [messages]);

  const dismissResumeNudge = useCallback(() => {}, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
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
    const messageHistory = [...messagesRef.current, userMessage];
    messagesRef.current = messageHistory;
    setMessages(messageHistory);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messageHistory.map((message) => ({
            role: message.role,
            content: message.text,
          })),
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorPayload.message ?? "Request failed");
      }

      const data = (await response.json()) as { message?: string };
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text:
          data.message ??
          "Thanks for the question! I can share more about Yash’s experience.",
      };
      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        messagesRef.current = next;
        return next;
      });
    } catch (error) {
      const fallbackText = "Sorry, I hit a snag connecting to the resume assistant.";
      const errorText =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : fallbackText;
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant" as const,
            text: errorText,
          },
        ];
        messagesRef.current = next;
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [dismissResumeNudge]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePillSelect = (event: Event) => {
      const customEvent = event as CustomEvent<ResumePillSelectDetail>;
      const label = customEvent.detail?.label?.trim();
      if (!label) {
        return;
      }

      dismissResumeNudge();
      const autofill = `Tell me more about Yash's experience with ${label}`;
      setInput(autofill);
      if (isFloating) {
        setOpen(true);
      }
      setIsMinimized(false);
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        void sendMessage(autofill);
      });
    };

    window.addEventListener(RESUME_PILL_SELECT_EVENT, handlePillSelect as EventListener);
    return () => {
      window.removeEventListener(RESUME_PILL_SELECT_EVENT, handlePillSelect as EventListener);
    };
  }, [dismissResumeNudge, isFloating, sendMessage]);

  return (
    <div className={containerClassName}>
      {isOpen ? (
        <div
          className={`animate-slide-up overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--card-foreground)] shadow-[0_24px_80px_rgba(60,64,68,0.28)] ${panelWidthClassName}`}
        >
          <div
            className={`flex items-center justify-between bg-gradient-to-r from-[var(--accent-orange)] to-[#ffa574] px-4 py-3 ${
              isMinimized ? "" : "border-b border-[var(--accent-orange)]/40"
            }`}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-white sm:text-sm sm:tracking-[0.08em]">
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
              <div className="max-h-[48dvh] space-y-3 overflow-y-auto px-4 py-4 text-[0.95rem] text-[var(--card-muted)] sm:max-h-[360px] sm:text-sm">
                {messages.length === 0 ? (
                  <p>
                    Ask a question about Yash’s experience, impact, and strengths.
                  </p>
                ) : null}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`break-words rounded-2xl px-3 py-2 ${
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
                      className="rounded-full border border-[var(--card-border)] bg-white/80 px-3 py-1 text-xs text-[var(--card-muted)] hover:border-[var(--accent-orange)]/45 hover:bg-[var(--accent-orange)]/20 sm:text-sm"
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
                  ref={inputRef}
                  value={input}
                  onChange={(event) => {
                    if (!input && event.target.value) {
                      dismissResumeNudge();
                    }
                    setInput(event.target.value);
                  }}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-full border border-[var(--card-border)] bg-white/80 px-3 py-2 text-[0.95rem] text-[var(--accent-charcoal)] placeholder:text-[var(--accent-charcoal)]/60 focus:outline-none sm:text-sm"
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
          className="chat-pulse group flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--card-foreground)] shadow-[0_18px_60px_rgba(60,64,68,0.28)] transition hover:-translate-y-0.5 hover:border-[var(--accent-orange)] hover:text-[var(--accent-orange)] hover:shadow-[0_22px_70px_rgba(60,64,68,0.32)] sm:h-12 sm:w-12"
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
