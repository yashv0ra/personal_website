import Link from "next/link";

export default function LabPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--card-border)] bg-[var(--card-background)] p-8 text-[var(--card-foreground)] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--card-muted)]">Lab</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.12em]">Coming Soon</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--card-muted)]">
          This section is temporarily locked while the next Lab experience is being prepared.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] transition hover:scale-[1.01] hover:border-[var(--card-foreground)]"
        >
          Back Home
        </Link>
      </section>
    </main>
  );
}
