import Link from "next/link";
import type { ReactNode } from "react";

type NavEntry = {
  index: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  badge?: string;
};

const entries: NavEntry[] = [
  {
    index: "01",
    title: "Resume",
    description: "The full story — experience, leadership, education. An AI chat answers questions about my work.",
    href: "/resume",
    badge: "Chat with it",
  },
  {
    index: "02",
    title: "Lab",
    description: "Experiments and prototypes. Currently showing: Paint + Charades, a sketching game an AI tries to guess.",
    href: "/lab",
  },
  {
    index: "03",
    title: "Purdue Bar Lines",
    description: "A live app for checking bar wait times around Purdue's campus.",
    href: "https://purduebarlines.web.app",
    external: true,
  },
];

function ArrowIcon({ external }: { external?: boolean }) {
  if (external) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      >
        <path d="M7 17L17 7" />
        <path d="M8 7h9v9" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function RowContent({ entry }: { entry: NavEntry }) {
  return (
    <>
      <span className="w-8 shrink-0 pt-1.5 text-sm font-semibold text-[var(--accent-orange)]/80">
        {entry.index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-2xl font-semibold text-[var(--foreground)] transition-colors duration-300 group-hover:text-[var(--accent-orange)] sm:text-3xl">
            {entry.title}
          </span>
          {entry.badge ? (
            <span className="rounded-full border border-[var(--accent-orange)]/40 bg-[var(--accent-orange)]/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
              {entry.badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 block max-w-md text-sm leading-relaxed text-[var(--muted)]">
          {entry.description}
        </span>
      </span>
      <span className="shrink-0 self-center text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--accent-orange)]">
        <ArrowIcon external={entry.external} />
      </span>
    </>
  );
}

function NavRow({ entry, children }: { entry: NavEntry; children: ReactNode }) {
  const rowClass =
    "group flex w-full items-start gap-4 border-t border-[var(--line-soft)] px-3 py-5 text-left transition-colors duration-300 last:border-b hover:bg-white/[0.03] sm:gap-6 sm:px-4 sm:py-6";

  if (entry.external) {
    return (
      <a href={entry.href} target="_blank" rel="noreferrer" className={rowClass}>
        {children}
      </a>
    );
  }
  return (
    <Link href={entry.href} className={rowClass}>
      {children}
    </Link>
  );
}

export default function HomeNav() {
  return (
    <nav aria-label="Site sections" className="w-full">
      {entries.map((entry) => (
        <NavRow key={entry.index} entry={entry}>
          <RowContent entry={entry} />
        </NavRow>
      ))}
    </nav>
  );
}
