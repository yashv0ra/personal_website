"use client";

import { FormEvent, useEffect, useState } from "react";

const LAB_PASSCODE = "1234";
const LAB_OPTIONS = [
  {
    title: "Block Summit 3D",
    tag: "Active Prototype",
    description: "A Three.js platform challenge. Explore the latest prototype UI and controls.",
    action: "Launch",
    isAvailable: false,
  },
  {
    title: "Snake game",
    tag: "Arcade Classic",
    description: "Classic grid movement and growth-based gameplay, currently being refactored.",
    action: "Coming soon",
    isAvailable: false,
  },
  {
    title: "Club Penguin: Island Session",
    tag: "Social World Replica",
    description: "Explore Town, Plaza, and Beach in a lightweight prototype interface.",
    action: "Coming soon",
    isAvailable: false,
  },
] as const;

export default function LabPage() {
  const [passcode, setPasscode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("code") === LAB_PASSCODE) {
      setIsUnlocked(true);
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passcode === LAB_PASSCODE) {
      setIsUnlocked(true);
      setPasscode("");
      setError("");
      return;
    }

    setPasscode("");
    setError("Incorrect passcode. Please try again.");
  };

  if (isUnlocked) {
    return (
      <main className="dot-grid relative min-h-screen overflow-hidden px-6 py-12 text-[var(--foreground)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0.16)_55%,rgba(0,0,0,0.28))]" />
        <section className="relative z-10 mx-auto w-full max-w-4xl rounded-[2rem] border border-[rgba(221,220,219,0.3)] bg-[rgba(20,23,26,0.52)] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-peach)]">
            Lab Index
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Browse available lab prototypes and launch points. New experiments will appear here as they are published.
          </p>

          <ul className="mt-8 grid gap-4">
            {LAB_OPTIONS.map((project) => (
              <li
                key={project.title}
                className="rounded-2xl border border-[rgba(221,220,219,0.35)] bg-[rgba(255,255,255,0.06)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="inline-flex rounded-full border border-[rgba(253,123,65,0.5)] bg-[rgba(253,123,65,0.15)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-peach)]">
                      {project.tag}
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h2>
                    <p className="max-w-2xl text-sm text-[var(--muted)] sm:text-base">
                      {project.description}
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={!project.isAvailable}
                      className="rounded-full border border-[var(--card-border)] bg-[var(--card-background)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--card-foreground)] transition disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {project.action}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm rounded-3xl border border-[var(--card-border)] bg-[var(--card-background)] p-8 text-[var(--card-foreground)] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.12em]">Lab Access</h1>
        <p className="mt-3 text-sm text-[var(--card-muted)]">
          Enter the 4-digit passcode to unlock this section.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label htmlFor="lab-passcode" className="flex flex-col gap-2 text-xs uppercase tracking-[0.16em]">
            Passcode
            <input
              id="lab-passcode"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcode}
              onChange={(event) => {
                const nextValue = event.target.value.replace(/\D/g, "").slice(0, 4);
                setPasscode(nextValue);
                if (error) {
                  setError("");
                }
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "lab-passcode-error" : undefined}
              className="rounded-xl border border-[var(--card-border)] bg-[rgba(0,0,0,0.12)] px-4 py-3 text-base tracking-[0.35em] outline-none transition-colors focus:border-[var(--card-foreground)]"
              required
            />
          </label>

          {error ? <p id="lab-passcode-error" className="text-sm text-[#c92c2c]">{error}</p> : null}

          <button
            type="submit"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-background)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] transition hover:scale-[1.01] hover:border-[var(--card-foreground)]"
          >
            Unlock Lab
          </button>
        </form>
      </section>
    </main>
  );
}
