"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CARD_TITLES, INTRO_MS, nextCard, type CardIndex, type RoomPhase } from "./sequence";
import type { CardBounds, RoomController } from "./room";
import styles from "./cinematic.module.css";

type Stage = "entrance" | "transition" | "room";
const STORAGE_KEY = "yash-room-v1";
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function CinematicHome({ email, links }: { email: string; links: { label: string; url: string }[] }) {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const entrance = useRef<HTMLDivElement>(null);
  const entryButton = useRef<HTMLButtonElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<RoomController | null>(null);
  // Readiness is a latch, not an owner: a loaded controller may later be disposed.
  const load = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const lifetime = useRef(0);
  const started = useRef(false);
  const reduced = useRef(false);
  const currentPhase = useRef<RoomPhase>("revealing");
  const currentIndex = useRef<CardIndex>(0);
  const navigating = useRef(false);
  const focusOnReady = useRef(false);
  const focusOnEntrance = useRef(false);
  const dismissingAbout = useRef(false);
  const animations = useRef<Animation[]>([]);
  const [stage, setStage] = useState<Stage>("entrance");
  const [phase, setPhase] = useState<RoomPhase>("revealing");
  const [index, setIndex] = useState<CardIndex>(0);
  const [bounds, setBounds] = useState<CardBounds | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutClosing, setAboutClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const onState = useCallback((nextPhase: RoomPhase, nextIndex: CardIndex) => {
    if (!alive.current) return;
    currentPhase.current = nextPhase; currentIndex.current = nextIndex;
    setPhase(nextPhase); setIndex(nextIndex);
    if (nextPhase === "ready") {
      setRevealed(true);
      try { sessionStorage.setItem(STORAGE_KEY, String(nextIndex)); } catch { /* Private storage is optional. */ }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const generation = ++lifetime.current;
    let cancelled = false;
    const construction = new AbortController();
    let abandoned = false;
    const ownedAnimations: Animation[] = [];
    animations.current = ownedAnimations;
    const valid = () => !cancelled && generation === lifetime.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)"); reduced.current = media.matches;
    const changed = () => { reduced.current = media.matches; controller.current?.setReducedMotion(media.matches); };
    media.addEventListener("change", changed);
    let saved: CardIndex | null = null;
    try { const value = sessionStorage.getItem(STORAGE_KEY); if (value !== null && /^[012]$/.test(value)) saved = Number(value) as CardIndex; } catch { /* Continue with the entrance. */ }
    const activateFallback = () => {
      if (!valid()) return;
      abandoned = true;
      construction.abort();
      setFallback(true);
      controller.current?.dispose(); controller.current = null;
      if (started.current) onState("ready", currentIndex.current);
    };
    const creating = import("./room").then(({ createRoom }) => {
      if (!valid() || abandoned || !host.current) return null;
      return createRoom(host.current, {
        onState: (nextPhase, nextIndex) => { if (valid() && !abandoned) onState(nextPhase, nextIndex); },
        onBounds: b => { if (valid() && !abandoned) { setBounds(b); setViewportWidth(host.current?.clientWidth ?? window.innerWidth); } },
        onControlsReveal: () => { if (valid() && !abandoned) setRevealed(true); },
        onFailure: activateFallback,
      }, reduced.current, construction.signal);
    }).then(room => {
      if (!valid() || abandoned) { room?.dispose(); return null; }
      controller.current = room;
      return room;
    }).catch(error => {
      if (valid()) console.warn("Cinematic room unavailable:", error instanceof Error ? error.message : "Rendering initialization failed");
      activateFallback();
      return null;
    });
    let timeout: ReturnType<typeof setTimeout>;
    const loadingTimeout = new Promise<null>(resolve => {
      timeout = setTimeout(() => { activateFallback(); resolve(null); }, 5000);
    });
    load.current = Promise.race([creating, loadingTimeout]).then(() => {
      clearTimeout(timeout);
      if (!valid()) return;
      setSceneReady(true);
      if (saved !== null && !started.current) {
        started.current = true; setStage("room");
        if (controller.current) controller.current.enter(saved, true);
        else onState("ready", saved);
      }
    });
    return () => {
      cancelled = true; alive.current = false; clearTimeout(timeout); construction.abort();
      media.removeEventListener("change", changed);
      ownedAnimations.forEach(a => a.cancel()); controller.current?.dispose(); controller.current = null;
    };
  }, [onState]);

  useEffect(() => {
    if (stage === "room" && phase === "ready" && !aboutOpen && focusOnReady.current) {
      focusOnReady.current = false;
      action.current?.focus({ preventScroll: true });
    }
    if (stage === "entrance" && focusOnEntrance.current) {
      focusOnEntrance.current = false;
      entryButton.current?.focus({ preventScroll: true });
    }
  }, [stage, phase, aboutOpen]);

  async function enter() {
    if (started.current) return;
    const generation = lifetime.current;
    const valid = () => alive.current && generation === lifetime.current;
    started.current = true; focusOnReady.current = true; setStage("transition");
    if (!reduced.current && entryButton.current && entrance.current) {
      const pulse = entryButton.current.animate([
        { transform: "scale(1)" }, { transform: "scale(1.08)", offset: 0.22 },
        { transform: "scale(1)", offset: 0.46 }, { transform: "scale(1.08)", offset: 0.72 }, { transform: "scale(1)" },
      ], { duration: INTRO_MS.pulse, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" });
      animations.current.push(pulse);
      await pulse.finished.catch(() => {});
      if (!valid()) return;
      const box = entryButton.current.getBoundingClientRect();
      const scale = Math.max(innerWidth / box.width, innerHeight / box.height) * 1.5;
      const expansion = entryButton.current.animate([{ transform: "scale(1)", color: "#000", backgroundColor: "#d4d0c8" }, { color: "transparent", offset: 0.2 }, { transform: `scale(${scale})`, color: "transparent", backgroundColor: "#000" }], { duration: INTRO_MS.expand, easing: "cubic-bezier(0.77, 0, 0.175, 1)", fill: "forwards" });
      const fade = entrance.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: INTRO_MS.expand - 200, fill: "forwards" });
      animations.current.push(expansion, fade);
      await expansion.finished.catch(() => {}); await wait(INTRO_MS.black);
    } else {
      const fade = entrance.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" });
      if (fade) { animations.current.push(fade); await fade.finished.catch(() => {}); }
    }
    if (!valid()) return;
    await load.current;
    if (!valid()) return;
    // Context loss clears this ref. Never replay the controller captured by an
    // already-resolved loading promise, whose animation loop may have stopped.
    const room = controller.current;
    setStage("room");
    if (room) room.enter(0, false);
    else { setFallback(true); onState("ready", 0); }
  }

  function move(direction: number) {
    if (stage !== "room" || currentPhase.current !== "ready" || dialog.current?.open || navigating.current) return;
    if (fallback) onState("ready", nextCard(currentIndex.current, direction));
    else controller.current?.move(direction);
  }
  function openCard() {
    if (stage !== "room" || currentPhase.current !== "ready" || navigating.current || dialog.current?.open) return;
    if (currentIndex.current === 0) { dialog.current?.showModal(); setAboutOpen(true); }
    else {
      navigating.current = true;
      const destination = currentIndex.current === 1 ? "/resume" : "/lab";
      setLeaving(true);
      void wait(reduced.current ? 0 : 200).then(() => {
        if (alive.current) router.push(`${destination}?from=cinematic`);
      });
    }
  }
  function closeAbout() {
    if (!dialog.current?.open || dismissingAbout.current) return;
    dismissingAbout.current = true; setAboutClosing(true);
    const generation = lifetime.current;
    void wait(reduced.current ? 0 : 200).then(() => {
      if (alive.current && generation === lifetime.current) dialog.current?.close();
    });
  }
  function backToEntrance() {
    if (currentPhase.current !== "ready" || dialog.current?.open || navigating.current) return;
    animations.current.forEach(animation => animation.cancel()); animations.current.length = 0;
    controller.current?.enter(0, true);
    controller.current?.setActive(false);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* The entrance works without storage. */ }
    started.current = false; focusOnReady.current = false; focusOnEntrance.current = true;
    currentIndex.current = 0; currentPhase.current = "revealing";
    setIndex(0); setPhase("revealing"); setRevealed(false); setStage("entrance");
  }
  const ready = stage === "room" && phase === "ready";
  const interactiveStyle = bounds && !fallback ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height } : undefined;
  const navigationLeft = bounds ? Math.max(16, bounds.left - 105) : 0;
  const navigationRight = bounds ? Math.min(viewportWidth - 16, bounds.left + bounds.width + 105) : 0;
  return (
    <main className={styles.home} data-stage={stage} data-phase={phase} data-card={CARD_TITLES[index]} data-renderer={fallback ? "fallback" : "three"} data-scene-ready={sceneReady}>
      <div className={`${styles.roomLayer} ${stage === "room" ? styles.visible : ""} ${leaving ? styles.leaving : ""}`}>
        <div ref={host} className={styles.canvas} aria-hidden="true" />
        <div className={styles.vignette} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />
        <div className={styles.letterbox} aria-hidden="true" />
        {stage === "room" && <button className={`${styles.back} ${revealed ? styles.backVisible : ""}`} onClick={backToEntrance} aria-label="Back to entrance" disabled={!ready || aboutOpen || leaving}><Arrow left /> <span>Back</span></button>}
        <section aria-label="Portfolio sections" aria-roledescription="carousel" aria-busy={!ready} className={styles.controls} inert={stage !== "room" || aboutOpen || leaving} onKeyDown={e => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); move(e.key === "ArrowRight" ? 1 : -1); }
        }}>
          <button className={`${styles.cardAction} ${fallback ? styles.fallbackCard : ""}`} style={interactiveStyle} ref={action} aria-label={`Open ${CARD_TITLES[index]}`} aria-disabled={!ready || leaving} onClick={openCard} tabIndex={ready ? 0 : -1}>
            {fallback ? <><span className={styles.fallbackEmblem} aria-hidden="true"><Emblem index={index} /></span><span>{CARD_TITLES[index]}</span></> : <span className={styles.srOnly}>{CARD_TITLES[index]}</span>}
          </button>
          <div className={`${styles.navigation} ${revealed ? styles.navigationRevealed : ""} ${ready ? styles.navigationReady : ""}`} style={bounds && !fallback ? { top: bounds.top + bounds.height / 2, left: navigationLeft, width: Math.max(0, navigationRight - navigationLeft) } : undefined}>
            <button aria-label="Previous card" aria-disabled={!ready} onClick={() => move(-1)} tabIndex={ready ? 0 : -1}><Arrow left /></button>
            <button aria-label="Next card" aria-disabled={!ready} onClick={() => move(1)} tabIndex={ready ? 0 : -1}><Arrow /></button>
          </div>
          <p aria-live="polite" aria-atomic="true" className={styles.srOnly}>{ready ? `${CARD_TITLES[index]}, ${index + 1} of 3` : ""}</p>
        </section>
      </div>
      {stage !== "room" && <div ref={entrance} className={styles.entrance}>
        <button ref={entryButton} className={styles.enterButton} onClick={enter} aria-disabled={stage === "transition"}>click here</button>
      </div>}
      <dialog ref={dialog} className={styles.about} data-closing={aboutClosing} aria-labelledby="about-title" onCancel={e => { e.preventDefault(); closeAbout(); }} onClose={() => { dismissingAbout.current = false; focusOnReady.current = true; setAboutClosing(false); setAboutOpen(false); }} onClick={e => { if (e.target === dialog.current) closeAbout(); }}>
        <div className={styles.aboutContent}>
          <button className={styles.close} aria-label="Close About" onClick={closeAbout}>×</button>
          <p className={styles.eyebrow}>About</p>
          <h1 id="about-title">Yash Vora.</h1>
          <p>I work at the intersection of business, engineering, and product. I like open-ended problems: figuring out what matters, building something useful, and making it better.</p>
          <p>My work has taken me from engineering program management at Apple to hardware at Hyphen. This is a little space for that work—and the things I build out of curiosity.</p>
          <div className={styles.aboutLinks}>
            <a href={`mailto:${email}`}>Email ↗</a>
            {links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.url.includes("github") ? "GitHub" : "LinkedIn"} ↗</a>)}
          </div>
        </div>
      </dialog>
    </main>
  );
}
function Emblem({ index }: { index: CardIndex }) {
  if (index === 0) return <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 10l17 23v23M40 10L23 33M30 22l14 34 15-46" /></svg>;
  if (index === 1) return <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M15 6h24l12 12v40H15zM39 6v12h12M23 30h20M23 39h20M23 48h13" /></svg>;
  return <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M22 6h20M25 6v23L9 53q-3 5 3 5h40q6 0 3-5L39 29V6M19 40h26" /><circle cx="28" cy="48" r="2" /></svg>;
}
function Arrow({ left = false }: { left?: boolean }) {
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" style={left ? { transform: "rotate(180deg)" } : undefined}><path d="M4 12h15M13 5l7 7-7 7" /></svg>;
}
