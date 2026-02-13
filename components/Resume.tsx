import type { ReactNode } from "react";
import { resume } from "@/lib/resume";
import FloatingTermsBox from "@/components/FloatingTermsBox";

type TimelineItem = {
  title: string;
  subtitle: string;
  date: string;
  bullets: string[];
  tags?: string[];
};

type TimelineTone = "light" | "ivory";

type TimelineSectionConfig = {
  title: string;
  hint?: string;
  tone?: TimelineTone;
  items: TimelineItem[];
};

const lightTone = {
  card: "bg-[var(--card-background)] text-[var(--card-foreground)]",
  border: "border-[var(--card-border)]",
  muted: "text-[var(--card-muted)]",
  line: "bg-[var(--card-border)]",
  item: "bg-white/90 border-[var(--card-border)]",
  badge: "border-[var(--card-border)] text-[var(--card-muted)] bg-white/80",
  dotOuter:
    "border-[var(--card-border)] bg-[var(--accent-charcoal)] shadow-[0_0_16px_rgba(253,123,65,0.35)]",
  dotInner: "bg-[var(--accent-orange)]",
  hint: "text-[var(--muted)]",
} as const;

const timelineTones = {
  light: lightTone,
  ivory: lightTone,
} as const;

const timelineSections: TimelineSectionConfig[] = [
  {
    title: "Experience Timeline",
    hint: "Most recent first",
    tone: "light",
    items: resume.experience,
  },
  {
    title: "Leadership and Involvement",
    tone: "light",
    items: resume.leadership,
  },
];

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

function ResumeCard({
  children,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  tone?: TimelineTone;
  className?: string;
}) {
  const styles = timelineTones[tone];

  return (
    <div
      className={`rounded-3xl border p-4 shadow-[0_20px_60px_rgba(60,64,68,0.2)] sm:p-6 ${styles.card} ${styles.border} ${className}`}
    >
      {children}
    </div>
  );
}

function TimelineSection({
  title,
  hint,
  items,
  tone = "light",
}: TimelineSectionConfig) {
  const styles = timelineTones[tone];

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="resume-heading">{title}</h2>
        {hint ? (
          <span className={`text-[0.68rem] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.3em] ${styles.hint}`}>
            {hint}
          </span>
        ) : null}
      </div>
      <div
        className={`rounded-3xl border p-4 shadow-[0_20px_60px_rgba(60,64,68,0.2)] sm:p-8 lg:p-10 ${styles.card} ${styles.border}`}
      >
        <div className="relative">
          <div className={`absolute bottom-6 left-3 top-6 w-px sm:bottom-8 sm:left-5 sm:top-8 ${styles.line}`} />
          <div className="space-y-5 sm:space-y-8">
            {items.map((item) => (
              <article
                key={`${item.title}-${item.date}`}
                className="relative pl-8 sm:pl-12"
              >
                <div
                  className={`absolute left-3 top-6 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border sm:left-5 sm:top-8 sm:h-6 sm:w-6 ${styles.dotOuter}`}
                >
                  <div
                    className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${styles.dotInner}`}
                  />
                </div>
                <div
                  className={`rounded-2xl border p-4 shadow-[0_12px_30px_rgba(60,64,68,0.12)] sm:p-6 ${styles.item}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold sm:text-lg">{item.title}</h3>
                      <p className={`text-xs italic sm:text-sm ${styles.muted}`}>
                        {item.subtitle}
                      </p>
                    </div>
                    <span className={`text-xs sm:text-sm ${styles.muted}`}>
                      {item.date}
                    </span>
                  </div>
                  <ul
                    className={`mt-3 list-disc space-y-2 pl-4 text-[0.9rem] leading-relaxed sm:mt-4 sm:pl-5 sm:text-sm ${styles.muted}`}
                  >
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  {item.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] ${styles.badge}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Resume() {
  return (
    <div className="space-y-7 text-[var(--foreground)] sm:space-y-10">
      <header className="space-y-2.5 text-center sm:space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--card-foreground)] sm:text-3xl">
          {resume.basics.name}
        </h1>
        <p className="text-xs text-[var(--card-muted)] sm:text-sm">
          {resume.basics.location}
          <span className="mx-2 hidden sm:inline">|</span>
          <span className="block sm:inline">{" "}</span>
          <a
            href={`mailto:${resume.basics.email}`}
            className="font-medium text-[var(--card-foreground)] underline-offset-4 hover:underline"
          >
            {resume.basics.email}
          </a>
        </p>
        <p className="text-xs text-[var(--card-muted)] sm:text-sm">
          {resume.basics.links.map((link, index) => (
            <span key={link.url}>
              <a
                href={link.url}
                className="font-medium text-[var(--card-foreground)] underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
              {index < resume.basics.links.length - 1 ? <span className="mx-2">|</span> : null}
            </span>
          ))}
        </p>
        <div>
          <a
            href="/resume.png"
            download
            className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-white/80 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent-charcoal)] transition hover:bg-[var(--accent-orange)]/20 sm:text-xs sm:tracking-[0.2em]"
          >
            Download Resume
          </a>
        </div>
      </header>

      <section id="about" className="space-y-2.5 sm:space-y-3">
        <h2 className="resume-heading">{resume.about.heading ?? "About"}</h2>
        <ResumeCard className="text-[0.93rem] text-[var(--card-muted)] sm:text-sm">
          <p className="leading-relaxed">{resume.about.summary}</p>
        </ResumeCard>
      </section>

      <section className="space-y-2.5 sm:space-y-3">
        <h2 className="resume-heading">Learn more about me</h2>
        <ResumeCard className="p-6 sm:p-8">
          <FloatingTermsBox terms={floatingTerms} />
        </ResumeCard>
      </section>

      {timelineSections.map((section) => (
        <TimelineSection key={section.title} {...section} />
      ))}

      <section className="space-y-3 sm:space-y-4">
        <h2 className="resume-heading">Education</h2>
        <ResumeCard className="text-[0.92rem] text-[var(--card-muted)] sm:text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[0.98rem] font-semibold text-[var(--card-foreground)] sm:text-base">
              {resume.education.school}
            </h3>
            <span className="text-xs text-[var(--card-muted)] sm:text-sm">
              {resume.education.date}
            </span>
          </div>
          <p className="mt-2 text-sm italic">{resume.education.degree}</p>
          <p className="text-sm">{resume.education.gpa}</p>
          <p className="mt-3">
            <span className="font-semibold text-[var(--card-foreground)]">
              Relevant Coursework:
            </span>{" "}
            {resume.education.coursework}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[var(--card-foreground)]">
              Awards:
            </span>{" "}
            {resume.education.awards}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {resume.education.programs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResumeCard>
      </section>

    </div>
  );
}
