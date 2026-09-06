"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import styles from "./gate.module.css";

type GateState = { content: ReactNode; error: string };

export default function CinematicGate({ unlock }: {
  unlock: (formData: FormData) => Promise<GateState>;
}) {
  const password = useRef<HTMLInputElement>(null);
  const [state, submit, pending] = useActionState<GateState, FormData>(
    async (_previous, formData) => {
      try {
        // Previous UI state stays local; only the submitted password goes to
        // the server, where it is checked independently on every attempt.
        return await unlock(formData);
      } catch {
        return { content: null, error: "Unable to unlock. Please try again." };
      }
    },
    { content: null, error: "" },
  );

  useEffect(() => {
    if (!pending && state.error) password.current?.focus();
  }, [pending, state.error]);

  if (state.content) return state.content;

  return (
    <main className={styles.gate}>
      <a href="/" className={styles.back}>Back to home</a>
      <form action={submit} className={styles.form} aria-busy={pending}>
        <h1 className={styles.heading}>Enter password</h1>
        <label className={styles.label} htmlFor="cinematic-password">Password</label>
        <input
          ref={password}
          id="cinematic-password"
          name="password"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          required
          maxLength={128}
          readOnly={pending}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "cinematic-password-error" : undefined}
          className={styles.input}
        />
        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? "Unlocking…" : "Unlock"}
        </button>
        <p id="cinematic-password-error" role="alert" className={styles.error}>
          {state.error}
        </p>
      </form>
    </main>
  );
}
