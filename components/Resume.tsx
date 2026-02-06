import type { ReactNode } from "react";
import { resume } from "@/lib/resume";

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

const timelineTones = {
  light: {
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
  },
  ivory: {
    card: "bg-[var(--accent-ivory)] text-[var(--accent-charcoal)]",
    border: "border-[var(--accent-charcoal)]/20",
    muted: "text-[var(--accent-charcoal)]/70",
    line: "bg-[var(--accent-charcoal)]/25",
    item: "bg-white/75 border-[var(--accent-charcoal)]/20",
    badge:
      "border-[var(--accent-charcoal)]/25 text-[var(--accent-charcoal)]/70 bg-white/60",
    dotOuter:
      "border-[var(--accent-charcoal)]/35 bg-[var(--accent-charcoal)] shadow-[0_0_16px_rgba(253,123,65,0.3)]",
    dotInner: "bg-[var(--accent-orange)]",
    hint: "text-[var(--accent-charcoal)]/60",
  },
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
    tone: "ivory",
    items: resume.leadership,
  },
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
      className={`rounded-3xl border p-6 shadow-[0_20px_60px_rgba(60,64,68,0.2)] ${styles.card} ${styles.border} ${className}`}
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="resume-heading">{title}</h2>
        {hint ? (
          <span className={`text-xs uppercase tracking-[0.3em] ${styles.hint}`}>
            {hint}
          </span>
        ) : null}
      </div>
      <div
        className={`rounded-3xl border p-8 shadow-[0_20px_60px_rgba(60,64,68,0.2)] sm:p-10 ${styles.card} ${styles.border}`}
      >
        <div className="relative">
          <div className={`absolute left-5 top-8 bottom-8 w-px ${styles.line}`} />
          <div className="space-y-8">
            {items.map((item) => (
              <article
                key={`${item.title}-${item.date}`}
                className="relative pl-12"
              >
                <div
                  className={`absolute left-5 top-8 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border ${styles.dotOuter}`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${styles.dotInner}`}
                  />
                </div>
                <div
                  className={`rounded-2xl border p-6 shadow-[0_12px_30px_rgba(60,64,68,0.12)] ${styles.item}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className={`text-sm italic ${styles.muted}`}>
                        {item.subtitle}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] ${styles.badge}`}
                    >
                      {item.date}
                    </span>
                  </div>
                  <ul
                    className={`mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed ${styles.muted}`}
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
    <div className="space-y-10 text-[var(--foreground)]">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--card-foreground)]">
          {resume.basics.name}
        </h1>
        <p className="text-sm text-[var(--card-muted)]">
          {resume.basics.location} |{" "}
          <a
            href={`mailto:${resume.basics.email}`}
            className="font-medium text-[var(--card-foreground)] underline-offset-4 hover:underline"
          >
            {resume.basics.email}
          </a>
        </p>
        <p className="text-sm text-[var(--card-muted)]">
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
              {index < resume.basics.links.length - 1 ? " | " : null}
            </span>
          ))}
        </p>
        <div>
          <a
            href="/resume.png"
            download
            className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-charcoal)] transition hover:bg-[var(--accent-orange)]/20"
          >
            Download Resume
          </a>
        </div>
      </header>

      <section id="about" className="space-y-3">
        <h2 className="resume-heading">{resume.about.heading ?? "About"}</h2>
        <ResumeCard className="text-sm text-[var(--card-muted)]">
          <p className="leading-relaxed">{resume.about.summary}</p>
        </ResumeCard>
      </section>

      {timelineSections.map((section) => (
        <TimelineSection key={section.title} {...section} />
      ))}

      <section className="space-y-4">
        <h2 className="resume-heading">Education</h2>
        <ResumeCard className="text-sm text-[var(--card-muted)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--card-foreground)]">
              {resume.education.school}
            </h3>
            <span className="text-sm text-[var(--card-muted)]">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="resume-heading">Skills</h2>
          <ResumeCard className="text-sm text-[var(--card-muted)]">
            <p>
              <span className="font-semibold text-[var(--card-foreground)]">
                Technical:
              </span>{" "}
              {resume.skills.technical}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-[var(--card-foreground)]">
                Business:
              </span>{" "}
              {resume.skills.business}
            </p>
          </ResumeCard>
        </section>

        <section className="space-y-3">
          <h2 className="resume-heading">Ask Me About</h2>
          <ResumeCard className="text-sm text-[var(--card-muted)]">
            <div className="flex flex-wrap gap-2">
              {resume.ask.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--card-border)] bg-white/80 px-4 py-1 text-xs font-medium text-[var(--card-muted)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </ResumeCard>
        </section>
      </div>
    </div>
  );
}
