import InteractiveDotField from "@/components/InteractiveDotField";
import HomeNav from "@/components/HomeNav";
import River from "@/components/River";
import { resume } from "@/lib/resume";
import Image from "next/image";
import Link from "next/link";

type SocialLinkId = "github" | "linkedin";

type SocialLink = {
  id: SocialLinkId;
  href: string;
  label: string;
};

function getResumeLink(keyword: string): string | null {
  const match = resume.basics.links.find((link) => link.label.toLowerCase().includes(keyword));
  return match?.url ?? null;
}

const socialLinkCandidates = [
  { id: "github", href: getResumeLink("github"), label: "GitHub" },
  { id: "linkedin", href: getResumeLink("linkedin"), label: "LinkedIn" },
] satisfies Array<{ id: SocialLinkId; href: string | null; label: string }>;

const socialLinks: SocialLink[] = socialLinkCandidates.filter(
  (link): link is SocialLink => link.href !== null,
);

function SocialIcon({ id }: { id: SocialLinkId }) {
  if (id === "github") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[1.1rem] w-[1.1rem]"
        fill="currentColor"
      >
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.016-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.467-1.335-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.042.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.234 1.91 1.234 3.22 0 4.606-2.807 5.628-5.48 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .321.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[1.1rem] w-[1.1rem]"
      fill="currentColor"
    >
      <path d="M20.447 20.452H16.89V14.87c0-1.331-.027-3.045-1.852-3.045-1.853 0-2.136 1.445-2.136 2.944v5.683H9.345V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <a href="/cinematic" aria-label="Enter Yash’s desk" title="Enter Yash’s desk" className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-orange)] sm:right-8 sm:top-7">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </a>
      <InteractiveDotField />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),rgba(0,0,0,0.12)_55%,rgba(0,0,0,0.3))]" />

      <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-6 pb-36 pt-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-44">
        <div className="stagger-in">
          <Link
            href="/resume#about"
            aria-label="View about section"
            className="group relative mb-8 block h-28 w-28 overflow-hidden rounded-full ring-2 ring-[var(--accent-orange)]/70 ring-offset-4 ring-offset-[var(--surface-1)] transition-transform duration-300 hover:-rotate-3 hover:scale-105 sm:h-32 sm:w-32"
          >
            <Image
              src="/profile.jpeg"
              alt="Portrait of Yash Vora"
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
          </Link>

          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-orange)]">
            Purdue IBE &rsquo;26 · Product Management
          </p>

          <h1 className="font-display mt-3 text-6xl font-bold leading-[0.95] sm:text-7xl lg:text-8xl">
            Yash
            <br />
            Vora
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Blending business acumen with technical expertise to best solve complex open-ended
            issues.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${resume.basics.email}`}
              className="lift inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-[#2a1607] transition-colors hover:bg-[var(--accent-orange-deep)] hover:text-[#fff5ee]"
            >
              Get in touch
            </a>
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={link.label}
                className="lift inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-soft)] bg-white/[0.05] text-[var(--muted)] transition-colors duration-200 hover:border-[var(--accent-orange)]/50 hover:text-[var(--accent-orange)]"
              >
                <SocialIcon id={link.id} />
              </a>
            ))}
          </div>
        </div>

        <div className="stagger-in">
          <HomeNav />
        </div>
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 hidden md:block">
        <River />
      </div>
    </div>
  );
}
