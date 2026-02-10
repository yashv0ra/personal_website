import Link from "next/link";

const nodeBase =
  "absolute flex h-44 w-44 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-background)] text-center text-base font-semibold uppercase tracking-[0.18em] text-[var(--card-foreground)] shadow-[0_0_40px_rgba(253,123,65,0.25)] transition-transform duration-300";

function ResumeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-10 w-10"
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
      className="h-10 w-10"
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

        <div className="pointer-events-none absolute -bottom-12 left-1/2 z-[1] w-[100dvw] -translate-x-1/2">
          <div className="river-flow">
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="riverBody" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                  <stop offset="28%" stopColor="rgba(221,220,219,0.22)" />
                  <stop offset="55%" stopColor="rgba(255,255,255,0.33)" />
                  <stop offset="82%" stopColor="rgba(221,220,219,0.2)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                </linearGradient>
                <linearGradient id="riverCurrent" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="45%" stopColor="rgba(255,255,255,0.75)" />
                  <stop offset="55%" stopColor="rgba(255,255,255,0.9)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>

              <g className="river-surface">
                <path
                  d="M0 74 C90 55 190 95 280 76 C365 58 455 102 548 74 C640 47 735 94 824 72 C895 55 948 62 1000 72 L1000 120 L0 120 Z"
                  fill="url(#riverBody)"
                />
                <path
                  className="river-current"
                  d="M-20 74 C90 55 190 95 280 76 C365 58 455 102 548 74 C640 47 735 94 824 72 C895 55 948 62 1020 72"
                  fill="none"
                  stroke="url(#riverCurrent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  className="river-current river-current-slow"
                  d="M-20 83 C98 63 201 100 300 84 C390 70 472 104 560 84 C657 62 739 101 838 84 C904 72 952 74 1020 84"
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  className="river-current river-current-reverse"
                  d="M-20 90 C98 72 198 106 286 93 C378 78 457 111 550 92 C652 70 734 108 828 90 C908 76 956 82 1020 92"
                  fill="none"
                  stroke="rgba(221,220,219,0.42)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </g>
              <ellipse
                className="river-mist"
                cx="500"
                cy="94"
                rx="410"
                ry="18"
                fill="rgba(255,255,255,0.14)"
              />
            </svg>
          </div>
        </div>

        <Link
          href="/resume"
          className={`${nodeBase} group left-[6%] top-[20%] z-10 flex-col gap-2 hover:scale-105`}
        >
          <ResumeIcon />
          <span>Resume</span>

          <span className="pointer-events-none absolute left-[calc(100%-0.25rem)] top-0 z-20 translate-x-1 -translate-y-5 rotate-[-8deg] scale-90 opacity-0 transition-all duration-300 group-hover:translate-x-3 group-hover:-translate-y-9 group-hover:rotate-[-4deg] group-hover:scale-100 group-hover:opacity-100">
            <span className="absolute -left-2 bottom-4 h-5 w-5 rotate-45 border-b-2 border-l-2 border-[var(--card-border)] bg-[var(--card-background)]" />
            <span className="relative block whitespace-nowrap rounded-[1.8rem] border-2 border-[var(--card-border)] bg-[var(--card-background)] px-6 py-3 text-[0.9rem] font-semibold normal-case tracking-normal text-[var(--card-foreground)] shadow-[0_14px_30px_rgba(0,0,0,0.26)] sm:text-[1rem]">
              Chat with my resume!
            </span>
          </span>
        </Link>

        <Link
          href="/lab"
          className={`${nodeBase} group right-[6%] top-[20%] z-10 flex-col gap-2 hover:scale-105`}
          aria-label="Open Lab section"
        >
          <LabIcon />
          <span>Lab</span>

          <span className="pointer-events-none absolute right-[calc(100%-0.25rem)] top-0 z-20 -translate-x-1 -translate-y-5 rotate-[8deg] scale-90 opacity-0 transition-all duration-300 group-hover:-translate-x-3 group-hover:-translate-y-9 group-hover:rotate-[4deg] group-hover:scale-100 group-hover:opacity-100">
            <span className="absolute -right-2 bottom-4 h-5 w-5 rotate-45 border-r-2 border-t-2 border-[var(--card-border)] bg-[var(--card-background)]" />
            <span className="relative block whitespace-nowrap rounded-[1.8rem] border-2 border-[var(--card-border)] bg-[var(--card-background)] px-6 py-3 text-[0.9rem] font-semibold normal-case tracking-normal text-[var(--card-foreground)] shadow-[0_14px_30px_rgba(0,0,0,0.26)] sm:text-[1rem]">
              Play the latest prototype
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
