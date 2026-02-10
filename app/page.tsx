import InteractiveDotField from "@/components/InteractiveDotField";
import SpiderWeb from "@/components/SpiderWeb";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <InteractiveDotField />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0.12)_55%,rgba(0,0,0,0.28))]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="text-center">
          <Link
            href="/resume#about"
            aria-label="View about section"
            className="relative mx-auto mb-5 block h-36 w-36 overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--card-background)] shadow-[0_0_60px_rgba(253,123,65,0.3)] transition-transform duration-300 hover:scale-105 sm:h-40 sm:w-40"
          >
            <Image
              src="/profile.jpeg"
              alt="Portrait of Yash Vora"
              fill
              className="object-cover"
              priority
            />
          </Link>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Yash Vora
          </h1>
          <p className="mt-4 text-lg text-[var(--muted)] sm:text-2xl">
            Blending business acumen with technical expertise to best solve complex open-ended issues.
          </p>
        </div>
        <SpiderWeb />
      </main>
    </div>
  );
}
