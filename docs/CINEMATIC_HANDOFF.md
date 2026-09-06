# Cinematic portfolio — execution handoff

**State: in progress; not a completion claim.** Read [CINEMATIC_GOAL.md](CINEMATIC_GOAL.md) first. The complete user goal, timing, implementation contract, and completion rules transfer to the next agent.

## Current checkout and preservation

Initial local inspection: 2026-09-06 UTC; branch `main`; base commit `3a00f112c3cf6478799ffa81f1a4224dbaf37a11`; origin `https://github.com/yashv0ra/personal_website.git`. The coordinator has verified the remote source checkpoint **`codex/cinematic-room-handoff` at `c49c18284ae87047c5f3b65e49dd6c878ea8b978`**. This source-only checkpoint excludes binary concrete textures; run the asset bootstrap below. Local fixes or documentation updates after that commit require a new upload before the cloud checkout can include them.

Cloud task **`6a9cfc67-dd88-83e8-a2b0-c727f5f38492`**, currently titled **New chat**, has been created. The coordinator inspected the task and confirmed that its full continuation prompt was received and active. **Cloud checkout and goal-tool acknowledgment have not yet been received.** The cloud worker must explicitly verify the delivered branch/revision and instantiate or acknowledge the full active goal; receiving a prompt alone does not prove those steps. This is an intermediate checkpoint for continuing the complete goal, not final visual approval or deployment.

| Area | Observed source state at initial inspection |
| --- | --- |
| Homepage | `app/page.tsx` now renders `components/cinematic/CinematicHome.tsx` with existing email/contact data. |
| Scene | `components/cinematic/room.ts` contains a Three.js room, lamp, spotlight, local concrete maps, card artwork, haze/dust, camera/slide animation, resource disposal, and WebGL failure hooks. Refined desktop/mobile stills were viewed: full lamp is visible and concrete room depth improved. Further realism/motion review is required. |
| Sequence | `components/cinematic/sequence.ts` defines 450/650/250/2,100 ms entry stages, 1,100 ms switching, and bounded lamp ignition. Exact observed timing still requires browser measurement. |
| Lab | Purdue Bar Lines is a real anchor to `https://purduebarlines.web.app`, beside retained Paint + Charades. Production browser verification reached Lab, confirmed the anchor/Charades entry, and returned home with Lab restored. The external site's availability and live AI behavior are separate checks. |
| Dependencies | Manifest has Three.js `0.185.1` and `@types/three` `0.185.4`; Playwright is already present. `package-lock.json` changed. Three.js/material assets have been added locally. |
| Existing backend | Both AI routes read `OPENAI_API_KEY`; preserve modified `app/api/chat/route.ts`, `app/api/lab/vision-guess/route.ts`, and new `lib/openai.ts`. README changes include prior work. Do not revert or overwrite them. |

The parent task reports that a local API key is configured; this documentation agent has deliberately not opened its value. `.env*` is ignored. Cloud availability of credentials is unknown, and the key must not be copied into the handoff. Scene work and navigation can be verified without API credentials. If live AI verification is needed, use an already configured secure environment or follow the applicable secure-key workflow; report unavailable credentials as such.

`progress.md` contains historical game/Charades work from February 2026. Those results do **not** validate the current cinematic homepage.

## Run and inspect

From the checked-out repository:

```sh
git status --short
git rev-parse HEAD
npm ci
node scripts/download-room-assets.mjs
npm run dev -- --hostname 0.0.0.0
```

Use the actual URL printed by the dev server. `npm ci` downloads locked packages if they are not already cached; report any additional downloads. **The asset script is mandatory for the cloud checkpoint**, because the binary concrete maps are omitted from that source transfer. It uses only Node built-ins, fetches the three public CC0 JPGs from the verified Poly Haven URLs, verifies expected byte lengths and SHA-256 hashes before replacing files, and skips already verified files. Total download is 2,616,039 bytes. Do not substitute unrelated textures or skip this step when judging material quality.

Use the project's installed Playwright or the available browser tool, and preserve screenshots plus a recording of entry and both-direction card exchanges. Inspect the files visually rather than assuming their existence proves quality. Capture fresh-session, About, Resume, Lab, mobile portrait, and reduced-motion results. Keep runtime logs and machine/browser details with measurements.

For non-mutating source validation:

```sh
npx tsc --noEmit
npx eslint app/page.tsx components/cinematic app/lab/page.tsx
npx next build
```

Use `npx next build` for compilation-only validation: `npm run build` invokes the existing `prebuild` OCR sync, which rewrites `data/resume.json` even when `public/resume.png` is absent. If intentionally running the full build script, inspect that diff and preserve the user's resume content. Do not label a direct Next build as verification of the OCR pipeline.

Run the current real-browser checkpoint script against the actual server URL:

```sh
CINEMATIC_URL=http://localhost:3013 node scripts/verify-cinematic.mjs
```

Replace the example port with the running server's port. The script writes screenshots, `desktop-sequence.webm`, and `results.json` under `output/playwright/cinematic/`; it exercises entry, real Three.js rendering, card exchange, Resume/Lab links, About focus, Back/replay, mobile, reduced motion, console errors, and basic frame sampling without calling AI providers. It uses isolated browser contexts and Chromium `--enable-unsafe-swiftshader` for software WebGL in headless runs. The default local headless launch without that flag could not provide WebGL and correctly exercised the fallback; do not treat its fallback screenshots as 3D evidence or SwiftShader timings as real mobile-GPU performance.

**The final frozen-production script passed its desktop, mobile, and reduced-motion functional scenarios, with zero page errors.** The desktop run verifies real Three.js entry, Resume/Lab navigation and restored selection, About/Escape focus, Back → white → replay with one canvas, plus actual `WEBGL_lose_context` → fallback → Back → replay → working fallback navigation with zero canvases. The earlier replay regression is resolved in this production run. `output/playwright/cinematic/results.json` and `desktop-sequence.webm` exist; the documentation agent inspected the result JSON and the root viewed the current room, white-entrance and mobile screenshots.

**This is a functional pass, not a timing or performance pass.** The passive browser observer measured **15,599.2 ms entry**, **1,133.1 ms card switching**, and 120 requestAnimationFrame intervals with **91.6 ms median / 100 ms p95** (approximately 10–11 fps) under Chromium SwiftShader software WebGL with video recording. Desktop viewport was 1440×900 and the video was recorded at 960×600. The browser test deadline is 60 seconds to accommodate software-rendering/protocol stalls; raising that deadline did not make the intended 3.45-second entry pass. An earlier 15-second timeout produced a ready/Three diagnostic with GPU ReadPixels stalls. Investigate loading/clock/render costs and test hardware acceleration without recording before claiming the timing/performance target. Load-timeout/storage-failure coverage and broader visual/motion/performance inspection remain outstanding.

### Suggested browser verification sequence

1. Clear only the task's session entry (`yash-room-v1`) in the test browser, reload, verify only the white entrance/button, click, and record through the final steady room. Measure readiness from click and verify camera motion rather than a flat image scale.
2. Exercise About/Resume/Lab forward and backward, rapid repeated input, keyboard navigation, About Escape/Close/focus restoration, and return from content. Inspect blackout → physical exchange → ignition ordering, readable card artwork, and session restoration. Use the room's Back button to return to the white entrance, then re-enter; repeat with the fallback and reduced motion to confirm the latest explicit user requirement.
3. Repeat at desktop and phone viewports; emulate reduced motion and unavailable session storage; induce WebGL initialization failure/context loss and load delay. Confirm the real fallback remains usable without inventing production data.
4. Record frame timings on the available browser/hardware, check console errors, pause/resume after hiding the page, and revisit the route repeatedly to look for duplicate canvases/listeners/resource growth.
5. Compare stills and recordings against the cinematic brief, write specific visual criticisms, implement another pass, then rerun the affected scenarios. Report desktop-emulated mobile limits explicitly.

## Acceptance matrix

Status definitions: **source present** means only code inspection; **pending** means no adequate current evidence; **verified** requires a named result/artifact and exact tested revision. Change statuses only after inspecting actual evidence. A broad visual requirement cannot be closed by a narrow unit assertion.

| Requirement | Current status | Evidence needed to close |
| --- | --- | --- |
| Pure white single-button fresh entrance | Production initial entry and Back → white verified | Root viewed `output/playwright/cinematic/08-back-to-white.png`: correct white page with only `click here`. The old `entrance.png` remains invalid evidence; replay itself is currently failing below. |
| Two pulses, viewport expansion, blackout, dark hold | Entry function passed; full motion-art review pending | `desktop-sequence.webm` exists; inspect it and timed frames for the exact pulse/expansion/dark-hold choreography and visual artifacts. |
| Approximately 3.45 s entry and true 3D camera dolly | Real Three.js entry passed; timing target not met in measured software-rendering run | Actual browser-observed entry was 15,599.2 ms under SwiftShader plus recording, versus 3,450 ms intended. Isolate load/render/clock contributions and verify hardware-accelerated motion before closing. |
| Realistic room, visible lamp top/underside, physical square card, credible light/materials | Refined desktop/mobile and current production stills viewed; final realism pending | Root viewed `output/playwright/cinematic/04-room-about.png`: full lamp, card, and room visible. Earlier refined desktop/mobile stills also inspected. Continue material/light/depth refinement and actual motion scrutiny; stills do not prove movie-quality animation. |
| Emblem above each title, titles/cards activate destinations | About/Resume/Lab activation verified in production; full visual review pending | Current production run opened all three destinations. Inspect the final artwork for every card and complete keyboard-only activation coverage. |
| About, Resume, Lab cycle and wrap in both directions | Forward cycle/wrap passed in production; reverse/rapid-input coverage still pending | Root suite traverses About → Resume → Lab → About. Add explicit reverse wrap and repeated-input evidence without assuming forward coverage proves both. |
| Lamp off before slide; card settles before restrained ignition; 1.1 s switch | Functional switch passed; measured 1,133.1 ms; visual ordering review pending | Inspect recorded blackout/slide/settle/ignition and synchronization of bulb, spotlight, haze and artwork. Timing alone does not prove the choreography. |
| About modal, resume/chat, Purdue Bar Lines and Charades | Production About/Escape focus, Resume, Lab anchor and Charades entry verified | Live chat/Charades AI checks and external Purdue availability are not claimed. Preserve existing behavior; any live-provider verification needs secure credentials. |
| Same-tab return/reload restores selected card and skips intro | Production Resume and Lab return/restoration verified; broader matrix pending | Current real-Three run restored Resume after Resume → Home and Lab after Lab → Home. Reload, fresh session, and unavailable-storage variants remain to verify. |
| Room Back returns to white entrance and supports replay | Final production normal replay and actual context-loss fallback replay passed | Root suite returned to white, re-entered with one real-Three canvas, then induced actual context loss and replayed a working fallback with zero canvases. Interaction agent also verified reduced-motion replay. |
| Responsive framing and 44 px targets | Production desktop/mobile checks passed; mobile screenshot viewed | At 390×844, both arrows measure 44×44 at x=16 and x=330; final suite verifies in-viewport targets. Landscape/live-resize and actual mobile hardware remain to audit. |
| Reduced-motion fades without dolly/slide/flicker/dust | Reduced-motion entry/Back/replay interaction passed; complete visual behavior review pending | Interaction agent verified ready/About/three, one canvas, zero page errors after replay. Inspect the recorded reduced-motion transition to confirm no unwanted dolly/slide/flicker/dust. |
| WebGL failure/context loss/timeout provides working HTML fallback | Unavailable-WebGL fallback and actual production context-loss replay passed; timeout gaps remain | Final desktop result has `contextLossReplay: true`; fallback replay/navigation works with zero canvases. Delayed-loading timeout and repeated failure cleanup still need evidence. |
| Keyboard, focus, labels, settled-card announcements | About Escape/focus verified after React commit; wider audit pending | Interaction agent confirmed correct focus restoration in real Three. Complete keyboard-only navigation, busy-state and announcement checks. |
| Pause/cleanup/performance adaptation | Performance measured under software rendering; target not established | SwiftShader plus recording: median RAF 91.6 ms, p95 100 ms across 120 intervals. Audit hidden-page/white-entrance rendering, cleanup/revisits and hardware acceleration; these figures are not a performance pass. |
| Professional research applied; iterate after looking at actual Playwright output | Research plus critique → scene correction → viewed re-render recorded; full goal ongoing | First lamp clipping/darkness improved in refined desktop/mobile stills. Continue cinematic realism and motion scrutiny; research/one pass does not satisfy the full quality objective. |
| TypeScript, lint, production compilation; no new browser errors | Final build/TypeScript and functional browser scenarios passed; ESLint exit 0 with 8 existing Lab warnings | Next build generated all eight static pages. No new cinematic lint warnings; eight existing Lab unused-variable warnings remain. Desktop/mobile/reduced-motion results each record zero page errors. GPU/protocol stalls are documented separately, not concealed by the functional pass. |
| Local review artifacts, goal replication, cloud continuity | Remote source revision and cloud prompt delivery verified; cloud checkout/goal acknowledgment pending | Remote branch is at `c49c18284ae87047c5f3b65e49dd6c878ea8b978`; task `6a9cfc67-dd88-83e8-a2b0-c727f5f38492` received the full prompt. Confirm its actual checkout, asset bootstrap, active goal, and any post-checkpoint fixes. |

## Sources and visual decision record

Existing asset provenance is in `public/room/CREDITS.md`: [Poly Haven Cracked Concrete Wall](https://polyhaven.com/a/cracked_concrete_wall), [CC0 license](https://polyhaven.com/license). The local maps are documented as 1K color, OpenGL normal, and roughness maps. The lamp, room/card geometry, and artwork are locally authored.

Approved technical reference: [Three.js resource cleanup](https://threejs.org/manual/en/cleanup.html). User-requested design guidance: [Emil Kowalski skills](https://github.com/emilkowalski/skills). Their installation is local to the original agent environment; do not assume the cloud agent has those paths. Use available installed skills, or read the upstream primary source as needed.

The coordinating task researched these primary professional sources and selected these applications. The applications are design judgments, not claims that this renderer reproduces the films' cinematography:

| Source | Practical decision applied to this scene |
| --- | --- |
| [American Cinematographer: Se7en, Darius Khondji](https://theasc.com/articles/flashback-seven-1995) | Motivate the scene's warm light with a visible practical lamp, retaining disciplined darkness and material texture. The lamp must be legible in-frame rather than looking like an unexplained glowing disk. |
| [American Cinematographer: Blade Runner 2049 production design](https://theasc.com/article/blade-runner-2049-designing-the-future/) | Use a consistent material and construction language for the room: concrete joints, aged metal, peripheral utilities and unified wear, avoiding decorative UI effects unrelated to the set. |
| [Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) | Use physically based roughness/normal response and distinguish color texture space from data maps. |
| [Three.js SpotLight](https://threejs.org/docs/pages/SpotLight.html) and [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) | Use a physical spotlight, controlled penumbra/shadows, tone mapping and bounded render settings; inspect their actual output rather than guessing from parameter values. |

First visual inspection: `output/playwright/room-first.png` was opened and viewed by the root and documentation agent. Its warm card surface/emblem were readable, but the lamp body was clipped and room depth was too difficult to see. The scene agent corrected camera framing and the dark ambient/material balance. Root and the documentation agent then opened `output/playwright/room-refined-desktop.png` and `output/playwright/interaction-mobile-three.png`: the full lamp is now visible, the floor/back wall convey more depth, and the portrait composition retains the card/arrows. The refined stills improve the brief but do not establish final cinematic realism or animation quality; the cloud agent must continue detailed material/light/motion critique and refinement.

Root also viewed the final production captures `output/playwright/cinematic/04-room-about.png`, `08-back-to-white.png`, and `mobile.png`: the room shot shows the full lamp/card/room, and the white shot shows only the correct entrance and `click here` button. The final production suite also passed replay and actual context-loss fallback replay. The animation video exists but final shot-by-shot artistic review and timing optimization remain required.

### First three cloud refinements

1. **Park or suspend RAF while hidden behind the white entrance.** Keep asset preloading, but avoid continuously rendering a concealed room. Investigate the 15.6-second measured entry and verify the intended 3.45-second choreography on hardware acceleration without recording; do not hide slow motion by merely extending test timeouts.
2. **Refine the harsh polygonal floor shadow.** Adjust believable shadow softness and restrained bounce so room depth reads physically, maintaining suspense and avoiding a flat bright wash.
3. **Improve close-up physical detail.** Refine the card's bevel/edge response and the lamp bulb's glass/filament so materials hold up during the camera push. Inspect full-speed motion and stills after each change; do not claim photorealism from detail count alone.

`output/playwright/entrance.png` is mislabeled due to test-session interference and must not be used as evidence of a clean white entrance. Use isolated contexts in the current verification script for new captures. Local screenshots may be omitted from the source-only checkpoint; regenerate them from the delivered revision when unavailable rather than treating local paths as accessible cloud artifacts.

## Cloud continuation prompt

The cloud task has received the full continuation instruction. The following reusable prompt retains the original scope for subsequent agents; supply the latest verified source revision and checkpoint evidence with it:

> Continue the cinematic Three.js portfolio implementation in this repository. Read docs/CINEMATIC_GOAL.md and docs/CINEMATIC_HANDOFF.md before changing code; they carry the entire active user goal, approved timing, implementation contract, and evidence gates. The user explicitly asks for professional horror/suspense film quality, extensive primary-source visual research, and repeated implementation → Playwright → actual image/recording inspection → critique → refinement. They also explicitly require a Back button in the room that returns to the plain white entrance and supports replay. Do not reduce the task to a passing build or preserve artificial-looking visuals because they are easy to test. Run `node scripts/download-room-assets.mjs` before rendering; binary concrete maps are omitted from the source handoff and must be restored with their verified hashes. Inspect the current checkout and last checkpoint, then continue the remaining acceptance rows. Replicate the verbatim goal using goal tools if available: inspect the current goal first, create it without a token budget only when none is active, and keep it active until every original requirement is proven complete. Delegate bounded independent work with this full goal when subagent tools are available. Preserve the existing OpenAI migration; never copy local .env files or API keys, never fabricate successful AI tests, and use secure environment credentials only if already configured or authorized. Keep concise progress updates and evidence in the repo. Do not deploy without the planned visual-review step. At a reproducible checkpoint, report the exact revision, commands/results, viewed artifacts, visual improvements, remaining gaps, and goal status. Mark complete only after auditing the full original goal against the final actual render and runtime behavior.

A cloud task on a repository's default branch may not contain the delivered handoff branch or later local fixes. The remote source upload and prompt receipt are verified, but the cloud agent still needs to acknowledge the exact checkout, restored assets, and complete active goal. Merely creating the task or sending the prompt does not prove those runtime states. Send a follow-up with any post-`c49c18284ae87047c5f3b65e49dd6c878ea8b978` revision before asking the cloud agent to validate the latest fix.

## Latest verified checkpoint

Verified remote checkpoint: `codex/cinematic-room-handoff` at `c49c18284ae87047c5f3b65e49dd6c878ea8b978`. Cloud task `6a9cfc67-dd88-83e8-a2b0-c727f5f38492` (**New chat**) received the complete active prompt; checkout/goal acknowledgment remain pending. **Final network-enabled Next production build passed compilation, TypeScript, and all eight static pages. Final ESLint exits 0 with eight existing unused-variable warnings in Lab and no new cinematic warnings; it is not warning-free.** The earlier sandbox-only Google Fonts fetch failure is resolved. Root ran `node scripts/download-room-assets.mjs`: all three existing asset hashes verified, with no downloads. **The root's final frozen-production functional browser suite passed desktop/mobile/reduced-motion, including the actual context-loss replay regression, with zero page errors.** The corrected source and this finalized evidence still need their post-`c49c18284ae87047c5f3b65e49dd6c878ea8b978` upload, whose SHA the dispatcher must provide to cloud.

| Evidence | Verified observation and limit |
| --- | --- |
| Viewed `output/playwright/room-first.png` → `room-refined-desktop.png` | Lamp changed from clipped to fully visible; concrete room depth improved. This records an actual critique/refinement loop, not final artistic acceptance. |
| Viewed `output/playwright/interaction-mobile-three.png` | Real Three.js at 390×844 with one canvas and visible full lamp/card. Interaction agent measured both arrows 44×44 at x=16 and x=330. Desktop headless viewport emulation is not mobile hardware validation. |
| Latest interaction-agent checks after fix | Normal full route restored Resume/Lab, About Escape returned focus, and Back/replay finished ready/About/three with one canvas and zero page errors. Reduced-motion entry plus Back/replay passed with the same state/canvas/error result. Default headless without the software-WebGL flag also verified fallback navigation and Resume restoration. |
| Final production run, port 3013 | `results.json` reports desktop/mobile/reduced-motion passed, each with zero page errors. Desktop verifies real-Three entry, Resume/Lab restoration, About Escape/focus, Back/normal replay and actual context-loss fallback replay. Root viewed final room/white/mobile stills. `desktop-sequence.webm` exists (960×600 recording, 1440×900 desktop viewport). |
| Context-loss/replay regression | Old production remained revealing/canvas0 beyond 7 s after real context loss and replay. Fixed dev passed narrowly, then final frozen production recorded `contextLossReplay: true`, with working fallback navigation and zero canvases after replay. |
| Timing/performance limits | Passive observer: entry 15,599.2 ms; switch 1,133.1 ms. SwiftShader+recording, 120 RAF intervals: median 91.6 ms/p95 100 ms (~10–11 fps). The 60 s test deadline verifies eventual function; it is not the 3.45 s intro target or hardware-performance approval. |

No production deployment has occurred, and the active goal remains incomplete. Continue the three priority refinements above, inspect the actual video, verify intended timing and fluidity on hardware acceleration, close reverse/rapid-input/load-timeout/storage-failure/cleanup gaps, and update every matrix row after subsequent changes. The functional suite and video artifact are real evidence; they do not prove final movie-quality motion, the timing/performance goal, every edge case, or cloud checkout/goal replication.
