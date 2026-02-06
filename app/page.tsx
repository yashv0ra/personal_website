import SpiderWeb from "@/components/SpiderWeb";

export default function Home() {
  return (
    <div className="dot-grid min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="text-center">
          <p className="text-base uppercase tracking-[0.5em] text-[var(--muted)]">
            Yash Vora
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Product-minded engineer building thoughtful systems.
          </h1>
        </div>
        <SpiderWeb />
      </main>
    </div>
  );
}
