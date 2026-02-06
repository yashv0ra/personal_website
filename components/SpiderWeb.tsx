import Image from "next/image";
import Link from "next/link";

const nodeBase =
  "absolute flex h-36 w-36 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-background)] text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--card-foreground)] shadow-[0_0_40px_rgba(253,123,65,0.25)] transition-transform duration-300";

function ResumeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M7 4h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12h8M8 16h8" strokeLinecap="round" />
    </svg>
  );
}

function LabIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M9 3h6M10 3v6.5l-4.6 7.7A2.5 2.5 0 0 0 7.6 21h8.8a2.5 2.5 0 0 0 2.2-3.8L14 9.5V3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 14h6" strokeLinecap="round" />
    </svg>
  );
}

export default function SpiderWeb() {
  return (
    <div className="relative w-full max-w-5xl">
      <div className="relative mx-auto h-[420px] w-full">
        <div className="absolute inset-0">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 420"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="webGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3c4044" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#fd7b41" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#3c4044" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <line
              x1="210"
              y1="210"
              x2="500"
              y2="210"
              stroke="url(#webGlow)"
              strokeWidth="3"
            />
            <line
              x1="500"
              y1="210"
              x2="790"
              y2="210"
              stroke="url(#webGlow)"
              strokeWidth="3"
            />
          </svg>
        </div>

        <Link
          href="/resume#about"
          aria-label="View about section"
          className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 text-center transition-transform duration-300 hover:scale-105"
        >
          <div className="relative h-44 w-44 overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--card-background)] shadow-[0_0_60px_rgba(253,123,65,0.3)]">
            <Image
              src="/profile.jpeg"
              alt="Portrait of Yash Vora"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Yash Vora
          </div>
        </Link>

        <Link
          href="/resume"
          className={`${nodeBase} left-[6%] top-[30%] z-10 flex-col gap-2 hover:scale-105`}
        >
          <ResumeIcon />
          <span>Resume</span>
          <span className="text-[0.6rem] font-normal text-[var(--card-muted)]">
            Click to view
          </span>
        </Link>

        <div
          className={`${nodeBase} right-[6%] top-[30%] z-10 flex-col gap-2 text-[var(--card-muted)] opacity-70 grayscale transition-opacity duration-300 hover:scale-105`}
          aria-disabled="true"
        >
          <LabIcon />
          <span>Lab</span>
          <span className="text-[0.6rem] font-normal text-[var(--card-muted)]">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
