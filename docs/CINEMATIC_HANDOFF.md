# Cinematic portfolio — execution handoff

**State: in progress; not a completion claim.** Read [CINEMATIC_GOAL.md](CINEMATIC_GOAL.md) first. The complete user goal, timing, implementation contract, and completion rules transfer to the next agent.

## Current checkout and preservation

Initial handoff inspection: 2026-09-06 UTC; local branch `main`; base commit `3a00f112c3cf6478799ffa81f1a4224dbaf37a11`; origin `https://github.com/yashv0ra/personal_website.git`. The cinematic work is currently uncommitted. Re-read `git status --short` and the current revision before continuing; this snapshot is not proof that cloud has these edits.

| Area | Observed source state at initial inspection |
| --- | --- |
| Homepage | `app/page.tsx` now renders `components/cinematic/CinematicHome.tsx` with existing email/contact data. |
| Scene | `components/cinematic/room.ts` contains a Three.js room, lamp, spotlight, local concrete maps, card artwork, haze/dust, camera/slide animation, resource disposal, and WebGL failure hooks. Source exists; appearance is not yet verified by this document. |
| Sequence | `components/cinematic/sequence.ts` defines 450/650/250/2,100 ms entry stages, 1,100 ms switching, and bounded lamp ignition. Exact observed timing still requires browser measurement. |
| Lab | Purdue Bar Lines has now been added as a real anchor to `https://purduebarlines.web.app`, beside the retained Paint + Charades project. Source verified; destination/browser behavior remains pending. |
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
| Pure white single-button fresh entrance | Source present; runtime pending | Fresh-session screenshot and DOM check with no visible extra homepage content. |
| Two pulses, viewport expansion, blackout, dark hold | Source present; runtime pending | Viewed recording/timed frames confirming order, timing, and no white-edge/DOM artifacts. |
| Approximately 3.45 s entry and true 3D camera dolly | Source present; runtime pending | Browser measurement plus viewed recording; scene readiness delays reported separately. |
| Realistic room, visible lamp top/underside, physical square card, credible light/materials | First render fails framing/depth; refinement in progress | Initial `output/playwright/room-first.png` was actually viewed: lamp housing clipped above the top, almost all room surfaces unreadably dark. Re-render after correction, including mobile. |
| Emblem above each title, titles/cards activate destinations | Source present; runtime pending | About/Resume/Lab screenshots and click/keyboard behavior. |
| About, Resume, Lab cycle and wrap in both directions | Source present; runtime pending | Browser interaction evidence for forward/back wrap and rapid input guard. |
| Lamp off before slide; card settles before restrained ignition; 1.1 s switch | Source present; runtime pending | Viewed/timed transition frames and no mismatch between bulb, spot, haze, and card artwork. |
| About modal, resume/chat, Purdue Bar Lines and Charades | Source present; runtime pending | Purdue source anchor verified. Still need destination checks, About focus/Escape, existing resume/Charades behavior. Live AI checks require secure credentials. |
| Same-tab return/reload restores selected card and skips intro | Source present; runtime pending | Tests covering return, reload, fresh tab session, and unavailable storage. |
| Room Back returns to white entrance and supports replay | Newly requested; interaction agent implementing | Exercise room → Back → white entrance → click → room repeatedly, including fallback/reduced motion, storage clearing and focus restoration. |
| Responsive framing and 44 px targets | Source present; runtime pending | Desktop/portrait/landscape screenshots with no lamp/card/arrows clipped and target measurements. |
| Reduced-motion fades without dolly/slide/flicker/dust | Source present; runtime pending | Viewed reduced-motion recording and working destinations. |
| WebGL failure/context loss/timeout provides working HTML fallback | Source present; runtime pending | Exercised failure cases, fallback screenshots and navigation checks. |
| Keyboard, focus, labels, settled-card announcements | Source present; runtime pending | Keyboard-only and accessibility inspection across entry, switching and dialog. |
| Pause/cleanup/performance adaptation | Source present; runtime pending | Hidden-page/revisit behavior, actual frame data with environment, and renderer/resource checks. |
| Professional research applied; iterate after looking at actual Playwright output | Research and first viewed render recorded; refinement/re-render pending | Sources below informed direction. First still viewed, clipping/darkness identified, scene agent correcting. Need refined output and repeated critique. |
| TypeScript, lint, production compilation; no new browser errors | Initial TypeScript and direct Next production compilation passed; final rerun pending | Root reports TypeScript/direct Next build pass with all routes generated. Initial lint had two warnings being fixed. Later source changes require final checks; browser console evidence still pending. |
| Local review artifacts, goal replication, cloud continuity | Docs drafted; runtime/cloud pending | Durable screenshots/recording, delivered revision, cloud task identity and verified goal acknowledgment. |

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

First visual inspection: `output/playwright/room-first.png` was opened and viewed by the root and documentation agent. Its warm card surface/emblem were readable, but the lamp body was clipped and room depth was too difficult to see. The scene agent is correcting camera framing and the dark ambient/material balance. This is evidence of an iteration in progress, not of the required final quality. `output/playwright/entrance.png` is mislabeled due to test-session interference and must not be used as evidence of a clean white entrance.

## Cloud continuation prompt

Use this text with the actual transferable repository revision/artifacts when creating the cloud task:

> Continue the cinematic Three.js portfolio implementation in this repository. Read docs/CINEMATIC_GOAL.md and docs/CINEMATIC_HANDOFF.md before changing code; they carry the entire active user goal, approved timing, implementation contract, and evidence gates. The user explicitly asks for professional horror/suspense film quality, extensive primary-source visual research, and repeated implementation → Playwright → actual image/recording inspection → critique → refinement. They also explicitly require a Back button in the room that returns to the plain white entrance and supports replay. Do not reduce the task to a passing build or preserve artificial-looking visuals because they are easy to test. Run `node scripts/download-room-assets.mjs` before rendering; binary concrete maps are omitted from the source handoff and must be restored with their verified hashes. Inspect the current checkout and last checkpoint, then continue the remaining acceptance rows. Replicate the verbatim goal using goal tools if available: inspect the current goal first, create it without a token budget only when none is active, and keep it active until every original requirement is proven complete. Delegate bounded independent work with this full goal when subagent tools are available. Preserve the existing OpenAI migration; never copy local .env files or API keys, never fabricate successful AI tests, and use secure environment credentials only if already configured or authorized. Keep concise progress updates and evidence in the repo. Do not deploy without the planned visual-review step. At a reproducible checkpoint, report the exact revision, commands/results, viewed artifacts, visual improvements, remaining gaps, and goal status. Mark complete only after auditing the full original goal against the final actual render and runtime behavior.

A cloud task on a repository's default branch may not contain local uncommitted changes. Before dispatch, ensure the implementation and these documents are available to that exact task through a verified supported transfer or pushed revision. Check that the cloud agent can read the files and has acknowledged the complete goal. Merely creating a task or sending this prompt does not prove that the checkout or goal transferred.

## Latest verified checkpoint

Checkpoint is still being assembled. Root supplied these actual interim results: TypeScript passed; direct production compilation via `./node_modules/.bin/next build` passed and generated all routes; the initial lint pass had two warnings now being corrected. First browser still exists and was viewed at `output/playwright/room-first.png`; it exposes lamp clipping and weak room depth, which are being refined. The Purdue link is now present in current source.

No production deployment has occurred. No final refined render, transition recording, complete browser test matrix, current warning-free lint result, or verified cloud transfer is claimed yet. The coordinating agent must attach those artifacts/results as they arrive and record the exact transferable revision before dispatch. The active goal remains incomplete.
