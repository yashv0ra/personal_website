import InteractiveDotField from "@/components/InteractiveDotField";
import SpiderWeb from "@/components/SpiderWeb";
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
        className="h-5 w-5"
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
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M20.447 20.452H16.89V14.87c0-1.331-.027-3.045-1.852-3.045-1.853 0-2.136 1.445-2.136 2.944v5.683H9.345V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <InteractiveDotField />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0.12)_55%,rgba(0,0,0,0.28))]" />

      <main className="stagger-in relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <Link
            href="/resume#about"
            aria-label="View about section"
            className="relative mx-auto mb-4 block h-28 w-28 overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--card-background)] shadow-[0_0_60px_rgba(253,123,65,0.3)] transition-transform duration-300 hover:scale-105 sm:mb-5 sm:h-40 sm:w-40"
          >
            <Image
              src="/profile.jpeg"
              alt="Portrait of Yash Vora"
              fill
              className="object-cover"
              priority
            />
          </Link>
          <h1 className="text-gradient text-4xl font-bold tracking-tight sm:text-6xl">
            Yash Vora
          </h1>
          {socialLinks.length > 0 ? (
            <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  className="lift inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--accent-charcoal)] transition-colors duration-200 hover:border-[var(--accent-orange)] hover:text-[var(--accent-orange)]"
                >
                  <SocialIcon id={link.id} />
                </a>
              ))}
            </div>
          ) : null}
          <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-2xl">
            Blending business acumen with technical expertise to best solve complex open-ended issues.
          </p>
        </div>
        <SpiderWeb />
      </main>
    </div>
  );
}
