export default function River() {
  return (
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
        <g className="river-surfer" aria-hidden="true">
          <g className="river-surfer-rider">
            <path
              className="river-surfer-splash"
              d="M-24 12 C-14 8 -7 8 0 11 C9 15 17 15 26 11"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              className="river-surfer-board"
              d="M-26 9 C-10 1 11 1 32 9 C11 14 -8 14 -26 9"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g
              className="river-surfer-figure"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="4" cy="-14.5" r="3.2" />
              <path d="M4 -11.2 L5.5 -1.8" />
              <path d="M5 -7.2 L-2 -2.3" />
              <path d="M5.2 -7.3 L14 -6.1" />
              <path d="M5.5 -1.8 L-2.4 8.2" />
              <path d="M5.5 -1.8 L14.3 6.8" />
            </g>
          </g>
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
  );
}
