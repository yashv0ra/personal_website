import Link from "next/link";
import Resume from "@/components/Resume";
import ChatWidget from "@/components/ChatWidget";

export default function ResumePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="stagger-in mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="lift inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] backdrop-blur-sm transition-colors hover:border-[var(--accent-orange)]/40 hover:text-[var(--accent-orange)] sm:text-sm sm:tracking-[0.2em]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <span className="text-[0.7rem] uppercase tracking-[0.3em] text-[var(--accent-orange)] sm:text-xs">
            Resume
          </span>
        </div>
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-background)] p-4 shadow-[0_20px_80px_rgba(60,64,68,0.22)] sm:p-8 lg:p-12">
          <Resume />
        </div>
      </div>
      <ChatWidget variant="panel" />
    </div>
  );
}
