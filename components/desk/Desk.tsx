"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { ResumeData } from "@/lib/resume";
import styles from "./desk.module.css";
import Globe from "./Globe";

type Panel = "about" | "experience" | "projects" | "play" | "contact" | "notes" | "world" | "focus" | "interests";
type ObjectId = Panel | "lamp" | "radio";
const objects: { id: ObjectId; label: string; x: number; y: number; w: number; h: number }[] = [
  { id: "about", label: "About Yash", x: 38.6, y: 26.7, w: 23.4, h: 9.1 },
  { id: "experience", label: "Experience", x: 38.6, y: 41.8, w: 23.5, h: 45.5 },
  { id: "projects", label: "Projects", x: 36.6, y: 0, w: 26.7, h: 16.5 },
  { id: "world", label: "World clocks", x: 15.3, y: 10, w: 14, h: 31 },
  { id: "focus", label: "Coffee break · Focus timer", x: 65.6, y: 20.5, w: 10.8, h: 20 },
  { id: "play", label: "Play · The lab", x: 15.4, y: 48.2, w: 13.1, h: 12.5 },
  { id: "contact", label: "Get in touch", x: 64.8, y: 54, w: 18.8, h: 22.8 },
  { id: "notes", label: "Your scratchpad", x: 30.4, y: 38.9, w: 8.3, h: 13.6 },
  { id: "interests", label: "Away from the desk", x: 27, y: 66.7, w: 11, h: 19.4 },
  { id: "lamp", label: "Desk light", x: 83, y: 0, w: 17, h: 24 },
  { id: "radio", label: "Rain radio", x: 74.1, y: 37, w: 15, h: 20 },
];
const titles: Record<Panel, string> = { about: "Yash Vora", experience: "Experience", projects: "On my Mac", play: "A little play", contact: "Say hello.", notes: "Scratchpad", world: "Elsewhere, right now", focus: "One thing at a time.", interests: "Away from the desk" };
const zones = [["San Francisco", "America/Los_Angeles"], ["New York", "America/New_York"], ["London", "Europe/London"], ["Mumbai", "Asia/Kolkata"], ["Sydney", "Australia/Sydney"]];

export default function Desk({ resume }: { resume: ResumeData }) {
  const [globeActive, setGlobeActive] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [page, setPage] = useState(0);
  const [lamp, setLamp] = useState(true);
  const [motion, setMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [radio, setRadio] = useState(false);
  const [soundError, setSoundError] = useState("");
  const [note, setNote] = useState("");
  const [noteStatus, setNoteStatus] = useState("Saved on this device");
  const [now, setNow] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState(25 * 60);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [showObjects, setShowObjects] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const audioBusy = useRef(false);
  const mounted = useRef(true);
  const reduced = useRef(false);
  const running = motion && visible;

  useEffect(() => {
    mounted.current = true;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { reduced.current = media.matches; setMotion(!media.matches); };
    change(); media.addEventListener("change", change);
    const visibility = () => {
      setVisible(!document.hidden);
      if (document.hidden) { void audio.current?.close(); audio.current = null; setRadio(false); }
    };
    document.addEventListener("visibilitychange", visibility);
    try { setNote(localStorage.getItem("yash-desk-scratchpad") || ""); } catch { setNoteStatus("Storage unavailable — kept until you leave"); }
    const center = () => {
      if (viewport.current && surface.current) viewport.current.scrollLeft = (surface.current.offsetWidth - viewport.current.clientWidth) / 2;
    };
    center();
    const resize = new ResizeObserver(center); if (viewport.current) resize.observe(viewport.current);
    return () => { mounted.current = false; media.removeEventListener("change", change); document.removeEventListener("visibilitychange", visibility); resize.disconnect(); void audio.current?.close(); };
  }, []);

  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      if (deadline !== null) {
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setRemaining(left);
        if (left === 0) setDeadline(null);
      }
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (panel) dialog.current?.showModal();
  }, [panel]);

  function closePanel() { dialog.current?.close(); }
  function saveNote(value: string) {
    setNote(value);
    try { localStorage.setItem("yash-desk-scratchpad", value); setNoteStatus("Saved on this device"); }
    catch { setNoteStatus("Storage unavailable — kept until you leave"); }
  }
  async function toggleRadio() {
    if (audioBusy.current) return;
    setSoundError("");
    if (audio.current) { const ctx = audio.current; audio.current = null; setRadio(false); await ctx.close(); return; }
    audioBusy.current = true;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext(); audio.current = ctx;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const samples = buffer.getChannelData(0); let last = 0;
      for (let i = 0; i < samples.length; i++) { last = (last + (Math.random() * 2 - 1) * .025) / 1.025; samples[i] = last * 3.5; }
      const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1400;
      const gain = ctx.createGain(); gain.gain.value = .2;
      source.connect(filter).connect(gain).connect(ctx.destination); source.start(); await ctx.resume();
      if (!mounted.current || document.hidden || audio.current !== ctx) { if (ctx.state !== "closed") await ctx.close(); return; }
      setRadio(true);
    } catch { if (ctx && ctx.state !== "closed") void ctx.close(); audio.current = null; if (mounted.current) setSoundError("Audio unavailable in this browser."); }
    finally { audioBusy.current = false; }
  }
  function act(id: ObjectId, button: HTMLButtonElement, fromKeyboard: boolean) {
    if (id === "lamp") { setLamp(v => !v); return; }
    if (id === "radio") { void toggleRadio(); return; }
    trigger.current = button; setKeyboard(fromKeyboard); setPage(0); setPanel(id);
  }
  const experience = resume.experience[page];
  const timer = `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  function pan(direction: number) { viewport.current?.scrollBy({ left: direction * Math.min(500, viewport.current.clientWidth * .75), behavior: reduced.current || !motion ? "instant" : "smooth" }); }

  return <main className={styles.desk} data-stage="desk" data-motion={running} data-lamp={lamp}>
    <h1 className={styles.srOnly}>Yash Vora’s desk</h1>
    <nav className={styles.toolbar} aria-label="Desk controls">
      <Link href="/" aria-label="Back to home">↖ <span>Home</span></Link>
      <div>
        <button onClick={() => setShowObjects(v => !v)} aria-pressed={showObjects}>Objects <span aria-hidden="true">{showObjects ? "−" : "+"}</span></button>
        <button onClick={() => setMotion(v => !v)} aria-pressed={!motion} aria-label={motion ? "Pause animations" : "Resume animations"}>{motion ? "Ⅱ" : "▷"}</button>
      </div>
    </nav>
    <div ref={viewport} className={styles.viewport} aria-label="Pan across the desk" tabIndex={0} onKeyDown={e => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); pan(e.key === "ArrowLeft" ? -1 : 1); }
    }}>
      <div ref={surface} className={styles.surface} data-show-objects={showObjects}>
        {/* The scene is decorative; every actionable object has a real keyboard-accessible button. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/desk/desk.webp" width="1672" height="941" alt="" draggable={false} fetchPriority="high" className={styles.scene} />
        <div className={styles.dimmer} aria-hidden="true" />
        <div className={styles.lampGlow} aria-hidden="true" />
        <div className={styles.steam} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.typing} aria-hidden="true"><i /><i /></div>
        {objects.map(obj => <button key={obj.id} className={`${styles.object} ${styles[obj.id] || ""}`} style={{ left: `${obj.x}%`, top: `${obj.y}%`, width: `${obj.w}%`, height: `${obj.h}%` } as CSSProperties}
          data-object={obj.id} aria-label={obj.id === "lamp" ? `${lamp ? "Dim" : "Brighten"} desk light` : obj.id === "radio" ? `${radio ? "Stop" : "Play"} rain ambience` : obj.label}
          aria-pressed={obj.id === "lamp" ? lamp : obj.id === "radio" ? radio : undefined}
          onPointerEnter={e => { if (obj.id === "world" && e.pointerType === "mouse") setGlobeActive(true); }}
          onPointerLeave={() => { if (obj.id === "world") setGlobeActive(false); }}
          onFocus={() => { if (obj.id === "world") setGlobeActive(true); }}
          onBlur={() => { if (obj.id === "world") setGlobeActive(false); }}
          onClick={e => act(obj.id, e.currentTarget, e.detail === 0)}>
          <span className={styles.objectLabel}>{obj.id === "radio" ? radio ? "Rain · on" : "Rain radio" : obj.id === "lamp" ? lamp ? "Dim the light" : "Light on" : obj.label}</span>
          {obj.id === "world" && <span className={styles.globeOrb} aria-hidden="true"><Globe spinning={globeActive && running && !panel} /></span>}
          {obj.id === "radio" && <span className={styles.radioLed} data-on={radio} aria-hidden="true" />}
        </button>)}
        <button className={styles.deskClock} aria-label="Open world clocks" onClick={e => { trigger.current = e.currentTarget; setKeyboard(e.detail === 0); setPanel("world"); }}>{now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "··:··"}</button>
      </div>
    </div>
    <div className={styles.panControls}><button aria-label="Pan desk left" onClick={() => pan(-1)}>←</button><span aria-hidden="true">↔</span><button aria-label="Pan desk right" onClick={() => pan(1)}>→</button></div>
    <div className={styles.status} role="status">{soundError || (deadline ? `Focus · ${timer}` : remaining === 0 ? "Focus complete. Take a breath." : radio ? "Rain ambience · on" : "")}</div>
    <dialog ref={dialog} className={`${styles.dialog} ${panel === "experience" ? styles.bookDialog : ""} ${panel === "notes" ? styles.noteDialog : ""} ${panel === "projects" || panel === "play" ? styles.macDialog : ""}`} data-keyboard={keyboard} aria-labelledby="desk-panel-title"
      onClose={() => { setPanel(null); trigger.current?.focus({ preventScroll: true }); }} onClick={e => { if (e.target === e.currentTarget) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) closePanel(); } }}>
      <button className={styles.close} onClick={closePanel} aria-label="Close panel">×</button>
      {panel === "experience" ? <div className={styles.bookSpread}>
        <div className={styles.bookLeft}><span className={styles.eyebrow}>The working years</span><h2 id="desk-panel-title">Experience</h2><p>{String(page + 1).padStart(2, "0")} / {String(resume.experience.length).padStart(2, "0")}</p><a href="/resume?from=cinematic">Full résumé ↗</a><div className={styles.bookNav}><button disabled={page === 0} aria-label="Previous experience" onClick={() => setPage(p => p - 1)}>←</button><button disabled={page === resume.experience.length - 1} aria-label="Next experience" onClick={() => setPage(p => p + 1)}>→</button></div></div>
        <article key={page} className={styles.bookPage}><p className={styles.eyebrow}>{experience.date}</p><h3>{experience.title}</h3><p className={styles.role}>{experience.subtitle}</p><ul>{experience.bullets.map(b => <li key={b}>{b}</li>)}</ul></article>
        <div className={styles.bookCover} aria-hidden="true"><span>Experience</span></div>
      </div> : <div className={styles.panelContent}>
        <p className={styles.eyebrow}>{panel === "about" ? "A little introduction" : panel === "projects" ? "Projects & experiments" : panel === "notes" ? "A thought worth keeping" : "From the desk"}</p>
        <h2 id="desk-panel-title">{panel ? titles[panel] : ""}</h2>
        {panel === "about" && <><p>I work at the intersection of business, engineering, and product. I like open-ended problems: figuring out what matters, building something useful, and making it better.</p><p>My work has taken me from engineering program management at Apple to hardware at Hyphen.</p><div className={styles.links}><a href={`mailto:${resume.basics.email}`}>Email ↗</a>{resume.basics.links.map(l => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.url.includes("github") ? "GitHub" : "LinkedIn"} ↗</a>)}</div></>}
        {panel === "projects" && <div className={styles.projectList}><a href="https://purduebarlines.web.app" target="_blank" rel="noreferrer"><span>01</span><div><h3>Purdue Bar Lines</h3><p>Bar wait times around campus.</p></div><b>↗</b></a><a href="/lab?from=cinematic"><span>02</span><div><h3>Paint + Charades</h3><p>A drawing game with an AI guesser.</p></div><b>↗</b></a><a href="/resume?from=cinematic"><span>03</span><div><h3>Chat with my résumé</h3><p>Ask about my work and background.</p></div><b>↗</b></a></div>}
        {panel === "play" && <><div className={styles.gameGlyph} aria-hidden="true">✛ &nbsp; ● ●</div><a className={styles.primary} href="/lab?from=cinematic">Play Paint + Charades ↗</a><p className={styles.small}>Draw something. Give the AI a challenge.</p></>}
        {panel === "contact" && <><p className={styles.letter}>Have something in mind?<br />I’d love to hear about it.</p><a className={styles.email} href={`mailto:${resume.basics.email}`}>{resume.basics.email} ↗</a><div className={styles.links}>{resume.basics.links.map(l => <a href={l.url} key={l.url} target="_blank" rel="noreferrer">{l.url.includes("github") ? "GitHub" : "LinkedIn"} ↗</a>)}</div></>}
        {panel === "notes" && <><label className={styles.srOnly} htmlFor="desk-note">Your note</label><textarea id="desk-note" value={note} onChange={e => saveNote(e.target.value)} maxLength={4000} placeholder="Make something." spellCheck /><p className={styles.small} role="status">{noteStatus}</p><button className={styles.textButton} onClick={() => saveNote("")} disabled={!note}>Clear note</button></>}
        {panel === "world" && <div className={styles.clocks}>{zones.map(([city, zone]) => <div key={zone}><span>{city}</span><time>{now ? now.toLocaleTimeString("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit" }) : "—"}</time></div>)}</div>}
        {panel === "focus" && <><p className={styles.timer} aria-label={`${remaining === 0 ? "Focus complete" : "Time remaining"}: ${timer}`}>{timer}</p><div className={styles.timerButtons}><button className={styles.primary} onClick={() => { if (deadline) { setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))); setDeadline(null); } else { const duration = remaining || 25 * 60; setRemaining(duration); setDeadline(Date.now() + duration * 1000); } }}>{deadline ? "Pause" : remaining < 25 * 60 && remaining > 0 ? "Resume" : "Start focus"}</button><button className={styles.textButton} onClick={() => { setDeadline(null); setRemaining(25 * 60); }}>Reset</button></div><div className={styles.presets}>{[5, 15, 25].map(m => <button key={m} aria-pressed={remaining === m * 60 && !deadline} onClick={() => { setDeadline(null); setRemaining(m * 60); }}>{m} min</button>)}</div></>}
        {panel === "interests" && <><p className={styles.interestLead}>Ask me about…</p><div className={styles.interests}>{resume.ask.map(a => <span key={a}>{a}</span>)}</div><p className={styles.small}>Or competitive Smash—tournaments, team captaincy, and building a community at Purdue.</p></>}
      </div>}
    </dialog>
  </main>;
}

