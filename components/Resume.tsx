import Image from "next/image";
import type { ReactNode } from "react";
import { resume } from "@/lib/resume";
import FloatingTermsBox from "@/components/FloatingTermsBox";
import ScrollReveal from "@/components/ScrollReveal";

type TimelineItem = {
  title: string;
  subtitle: string;
  date: string;
  bullets: string[];
  tags?: string[];
};

function splitCsvTerms(value: string): string[] {
  return value
    .split(",")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

const floatingTerms = [
  ...splitCsvTerms(resume.skills.technical).map((label) => ({
    label,
    category: "Technical Skill" as const,
  })),
  ...splitCsvTerms(resume.skills.business).map((label) => ({
    label,
    category: "Business Skill" as const,
  })),
  ...resume.ask.map((label) => ({ label, category: "Ask Me About" as const })),
];

function SectionHeading({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-sm font-semibold text-[var(--accent-orange)]">{index}</span>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
        {title}
      </h2>
      {hint ? (
        <span className="ml-auto text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function PaperCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-[var(--card-background)] text-[var(--card-foreground)] shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

function DateBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-black/[0.06] px-3 py-1 text-xs font-medium text-[var(--card-muted)]">
      {children}
    </span>
  );
}

function TimelineSection({
  index,
  title,
  hint,
  items,
}: {
  index: string;
  title: string;
  hint?: string;
  items: TimelineItem[];
}) {
  return (
    <ScrollReveal>
      <section className="space-y-4">
        <SectionHeading index={index} title={title} hint={hint} />
        <PaperCard className="divide-y divide-black/[0.07]">
          {items.map((item) => (
            <article key={`${item.title}-${item.date}`} className="p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-[var(--accent-orange-ink)]">
                    {item.subtitle}
                  </p>
                </div>
                <DateBadge>{item.date}</DateBadge>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--card-muted)] sm:mt-4">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-[var(--accent-orange)]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              {item.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--card-border)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--card-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </PaperCard>
      </section>
    </ScrollReveal>
  );
}

function Sidebar() {
  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-2xl border border-[var(--line-soft)] bg-white/[0.04] p-6 sm:p-7">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--accent-orange)]/60 ring-offset-2 ring-offset-[var(--surface-1)] lg:h-24 lg:w-24">
            <Image
              src="/profile.jpeg"
              alt="Portrait of Yash Vora"
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--foreground)] lg:mt-4 lg:text-3xl">
              {resume.basics.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{resume.basics.location}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5 border-t border-[var(--line-soft)] pt-5 text-sm">
          <a
            href={`mailto:${resume.basics.email}`}
            className="block truncate text-[var(--muted)] transition-colors hover:text-[var(--accent-orange)]"
          >
            {resume.basics.email}
          </a>
          {resume.basics.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[var(--muted)] transition-colors hover:text-[var(--accent-orange)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="/resume.png"
          download
          className="lift mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-[#2a1607] transition-colors hover:bg-[var(--accent-orange-deep)] hover:text-[#fff5ee]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          Download resume
        </a>

        <p className="mt-5 hidden text-xs leading-relaxed text-[var(--muted)]/80 lg:block">
          Questions? The chat in the corner knows this resume inside out.
        </p>
      </div>
    </aside>
  );
}

export default function Resume() {
  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-10">
      <Sidebar />

      <div className="min-w-0 space-y-10 sm:space-y-12">
        <ScrollReveal>
          <section id="about" className="space-y-4">
            <SectionHeading index="01" title={resume.about.heading ?? "About"} />
            <PaperCard className="p-5 sm:p-7">
              <p className="max-w-[68ch] text-[0.95rem] leading-relaxed text-[var(--card-muted)]">
                {resume.about.summary}
              </p>
            </PaperCard>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="space-y-4">
            <SectionHeading index="02" title="Learn more about me" hint="Click a topic to ask the chat" />
            <FloatingTermsBox terms={floatingTerms} />
          </section>
        </ScrollReveal>

        <TimelineSection
          index="03"
          title="Experience"
          hint="Most recent first"
          items={resume.experience}
        />

        <TimelineSection index="04" title="Leadership" items={resume.leadership} />

        <ScrollReveal>
          <section className="space-y-4">
            <SectionHeading index="05" title="Education" />
            <PaperCard className="p-5 text-sm text-[var(--card-muted)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--card-foreground)] sm:text-xl">
                    {resume.education.school}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-[var(--accent-orange-ink)]">
                    {resume.education.degree}
                  </p>
                </div>
                <DateBadge>{resume.education.date}</DateBadge>
              </div>
              <p className="mt-3">{resume.education.gpa}</p>
              <p className="mt-3">
                <span className="font-semibold text-[var(--card-foreground)]">Relevant coursework:</span>{" "}
                {resume.education.coursework}
              </p>
              <p className="mt-1.5">
                <span className="font-semibold text-[var(--card-foreground)]">Awards:</span>{" "}
                {resume.education.awards}
              </p>
              <ul className="mt-4 space-y-2">
                {resume.education.programs.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-[var(--accent-orange)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PaperCard>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
