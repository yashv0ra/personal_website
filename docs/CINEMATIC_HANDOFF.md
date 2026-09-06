# Cinematic experience — current delivery record

The user's latest instruction preserves the normal landing page, opens this entire experience through a top-right X, and authorizes merging to `main` and publishing to yashvora.net. Read `CINEMATIC_GOAL.md` for the full artistic objective and timing contract. Older reports are preserved in `CINEMATIC_PRIOR_HANDOFF.md`; they are historical evidence, not current results.

## Routes and integration

- `/` restores the existing charcoal/orange landing page with a 44px X link to `/cinematic`. Three.js is not imported by the normal landing page.
- `/cinematic` keeps the pure-white `click here` entrance, physical room/card carousel, About dialog and Back/replay.
- Room destinations use `/resume?from=cinematic` and `/lab?from=cinematic`. The shared HomeLink validates that exact query value and returns to the saved room; ordinary destinations return to `/`.
- Three verified CC0 concrete textures are included in the repository. `scripts/download-room-assets.mjs` can verify or restore them; production no longer relies on a manual asset bootstrap.
- The prior OpenAI migration is preserved. No credentials were read or committed, and no provider calls are made by these tests.
- The OCR prebuild now truly leaves `data/resume.json` unchanged when `public/resume.png` is absent.

## Work reconciled

The starting remote revision was `bcee7a6942bde24101b767068d0889e964ea51a5`. A separate local worker continued its material/runtime work to `2664c1c` and published the source as `763c4d7c9dc5fef70c4a42f7de16a7c68114c463`; its report is preserved in `CINEMATIC_PRIOR_HANDOFF.md`. This delivery carries forward its rail/carriages, deeper card edges, filament, floor bounce, shader color conversion, camera settle, parked entrance RAF and shadow caching. Further changes here:

- Reflections apply only to metal, rather than flattening concrete with an environment-wide fill. Concrete relief is restrained and the floor shadow is softer.
- Transparent bulb glass retains reflections and a visible filament without a full-scene transmission render pass.
- The hidden entrance and hidden documents stop the renderer. Reduced-motion and degraded scenes also stop drawing after settling, resuming for transitions/resizes. Idle browser RAF rate is not evidence of animated GPU throughput.
- Pending texture loads are cancellable before React owns the controller. Timeout/unmount detaches the canvas, releases resources and disposes late texture results. During shader compilation, canvas/listeners detach immediately and GPU disposal waits for compilation settlement to avoid invalidating Three.js's internal program polling.
- Rendering failures enter the usable HTML fallback. Context-loss Back/replay remains functional.
- Reduced-motion exchanges fade stationary cards with constant light. Card opacity resets when the preference changes. Controls reveal during the final 200ms while activation remains guarded; aria-disabled preserves keyboard focus through an exchange.
- The small beveled entrance gains a 44px pointer hit region without enlarging its visual treatment.
- Capture scripts report actual capture timestamps; performance measurement begins at the click event and explicitly records whether draw instrumentation was enabled.

An independent read-only subagent reviewed interaction/lifecycle changes. No claim of live communication with the external cloud-task UUID is made; integration used visible GitHub comments and the shared repository records.

## Reproduce

```sh
npm ci
node scripts/download-room-assets.mjs
npm run build
node scripts/verify-cinematic-all.mjs
```

Install Playwright Chromium normally if needed. `CHROMIUM_PATH` selects an existing executable in restricted runtimes. The combined verifier starts one frozen production server and stops only that server. It runs performance measurements, the comprehensive route/context-loss suite, added edge cases, and timestamped visual capture. It never calls AI APIs. `npm run dev` accepts both standard Next flags and supervised preview flags.

## Evidence and limits

The inherited `CINEMATIC_EXTENDED_VALIDATION.json` is its prior run; its extended script has been adjusted for `/cinematic`. Current measured results are in `CINEMATIC_VALIDATION.json`, `CINEMATIC_EDGE_VALIDATION.json` and `CINEMATIC_PERFORMANCE.json`. Screenshots and video regenerate under `output/playwright/` and are ignored as test output.

Browser verification uses Chromium with SwiftShader software WebGL. The separate cloud preview browser lacks WebGL and was used to inspect its operational HTML fallback. Desktop screenshots at 1440×900 and portrait/landscape captures are viewport emulations, not phone-GPU measurements. Actual recorded frames were extracted and inspected alongside screenshots; early captures led to another material/light/performance pass.

| Acceptance area | Current evidence / limit |
| --- | --- |
| Normal landing and top-right X | Route, accessible 44px target, desktop/mobile screenshots and normal Resume/Lab return paths in edge suite. |
| White entrance, Back and replay | Comprehensive production suite; returns focus, clears saved selection, one canvas in Three mode and zero in fallback. |
| Camera dolly and settle | 1,650ms dolly plus 450ms settle in one render clock; recorded frames show actual perspective movement. Software-rendered wall times are recorded separately. |
| Physical lamp/card/concrete | Full lamp housing/underside, suspension, card thickness and warm practical pool inspected in screenshots. This is an artistic improvement, not a claim of movie-level photorealism. |
| Card switching, both directions and rapid input | Forward route suite; reverse/wrap and repeated-input edge tests. Constant camera, darkness before slide, bounded ignition in source and recorded frames. |
| About and content routes | About/Escape/focus; Resume and Lab returns; Purdue anchor and retained Charades entry. No live AI responses or external Purdue uptime test claimed. |
| Session restoration and denied storage | Route returns, reload, denied-storage entry/navigation/replay verified. |
| Reduced motion and responsiveness | Portrait, 844×390 landscape, stationary fades, touch-target bounds, replay; no real mobile-GPU claim. |
| WebGL failures and loading timeout | Actual context loss/replay; no-WebGL preview fallback; hanging texture timeout leaves zero canvases; route unmount during delayed loading is checked. |
| Keyboard/accessibility | Keyboard entry, reverse carousel, About/Escape and replay focus; guarded activation and settled-card announcement. |
| Cleanup and performance | Draw instrumentation reports zero draws on white entry and after Back. Low-performance mode renders the static settled scene on demand. Complete heap/GPU profiling and real hardware timing remain unverified. |
| Build and source checks | Production build, TypeScript, targeted ESLint and diff check. Existing Lab warnings are separate from cinematic code. |

Known limits: software rendering cannot establish the 3.45s hardware timing target or 60fps motion. A driver that never resolves shader compilation can retain its deferred GPU allocation after detachment; normal timeout and route cleanup are verified. The broad movie-quality artistic goal is not declared complete merely because functional checks pass. Publication is nonetheless explicitly authorized by the latest user instruction.

## Primary references

- [American Cinematographer: Se7en](https://theasc.com/article/seven-cinematography-khondji-fincher/) informed motivated practical light and warm/cool separation.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) informed shadow caching, precompilation and removal of a disproportionate transmission pass for the tiny bulb.
- [Three.js cleanup](https://threejs.org/manual/en/cleanup.html) informed explicit ownership, cancellation and disposal.
- Additional professional research and previous visual critiques are retained in the prior handoff; asset provenance is in `public/room/CREDITS.md`.
