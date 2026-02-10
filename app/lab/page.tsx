"use client";

import { FormEvent, useState } from "react";
import BlockGame3D from "@/components/game/BlockGame3D";

const LAB_PASSCODE = "1234";

export default function LabPage() {
  const [passcode, setPasscode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");

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
    return <BlockGame3D />;
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

          {error ? (
            <p id="lab-passcode-error" className="text-sm text-[#c92c2c]">
              {error}
            </p>
          ) : null}

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
