import HomeLink from "@/components/HomeLink";
import Resume from "@/components/Resume";
import ChatWidget from "@/components/ChatWidget";

export default function ResumePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <HomeLink
            className="lift inline-flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] backdrop-blur-sm transition-colors hover:border-[var(--accent-orange)]/40 hover:text-[var(--accent-orange)] sm:text-sm sm:tracking-[0.2em]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Home
          </HomeLink>
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--accent-orange)] sm:text-xs">
            Resume
          </span>
        </div>
        <Resume />
      </div>
      <ChatWidget variant="panel" />
    </div>
  );
}
