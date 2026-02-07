import Link from "next/link";
import Resume from "@/components/Resume";
import ChatWidget from "@/components/ChatWidget";

export default function ResumePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition-colors hover:text-[var(--accent-sandy)]"
          >
            ← Back to home
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Resume
          </span>
        </div>
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-background)] p-10 shadow-[0_20px_80px_rgba(60,64,68,0.22)] sm:p-12">
          <Resume />
        </div>
      </div>
      <ChatWidget variant="panel" />
    </div>
  );
}
