# Cinematic portfolio — persistent goal

This is the project record of the user's active goal. A handoff or passing build does not complete it. Continue iterating until the actual rendered experience satisfies the requirements below. Keep current evidence and remaining work in [CINEMATIC_HANDOFF.md](CINEMATIC_HANDOFF.md).

## Latest approved placement and publication — 2026-09-06

Follow-up: the user requested a password of `1111` after clicking the X and explicitly said to push to `main`. Show a server-validated password gate before the cinematic entrance. Each fresh visit starts locked; preserve the existing landing and cinematic experience behind it.

The user superseded the homepage placement and earlier branch-only restriction:

> keep this all as an X icon in the top right of the normal landing page for the website. Then push it all to main and then to yashvora.net.

The normal landing page stays at `/`. A 44px X link at its top right opens `/cinematic`, which retains the white entrance, room and replay. Resume/Lab opened from the room carry `from=cinematic` and return to the saved room; normal visits return to `/`. The user explicitly authorized merging to `main` and publishing through the existing yashvora.net deployment. Earlier no-main/no-deployment handoff instructions are superseded by this request. No separate permission step is required. Artistic quality and hardware-performance limitations must still be reported honestly.

## User's objective, verbatim

> Okay go! This is a goal because you are supposed to iterate, use playwright and look at the output, and then iterate. It should look like it was straight out of a professional looking animation. Please look up professional visual designers and stuff to make it as visually interesting as possible. Use max amount of research. Pretend you are a visual professional being paid $100k for this. Keep iterating until it looks like it is straight out of a real horror/suspense movie. Iterate every detail. Make it look as realistic as possible.

The user also explicitly requested that the goal be copied into the repository and delegated agents, with parallel subtasks, and handed to a cloud agent at the next meaningful stopping point. The entire objective transfers; do not substitute a smaller compatibility-only task. No token budget was requested.

Later explicit addition: after entering the room, provide a **Back** button that returns to the original white `click here` entrance. That button is part of the room controls, never extra content on the white entrance. The visitor can click again and replay the opening sequence; clear the saved room selection/entrance-completed state for that return.

## Approved experience

Rebuild the homepage as a cinematic entrance into a suspenseful, materially believable room, rendered in actual Three.js. The room is the portfolio navigation; retain the functional Resume/chat and Lab experiences.

1. A fresh visit starts with a pure white page and one centered, small, early-2000s beveled gray `click here` button. No header, footer, logo, or explanatory text.
2. Clicking pulses the button twice, expands it toward the viewer, and fades to black. After a deliberate dark beat, the camera dollies into the room. Final framing includes the hanging metal lamp's upper housing and illuminated underside, with a large square card beneath it.
3. The room has convincing concrete, a warm practical spotlight, faint haze/dust, physical depth, and restrained shadows. The card is a tangible, slightly thick object. Do not settle for a flat CSS background with an overlaid card.
4. Cycle About → Resume → Lab with arrows on either side, wrapping in both directions. Before each physical card exchange the lamp goes off; the incoming card slides into place in near darkness; the lamp then flickers back on. The camera remains still during repeated navigation.
5. Each card has a monochrome emblem above its title (YV monogram, document, flask). Clicking the title/card opens its destination. About opens a short introduction and existing contact links over the room; Resume opens `/resume`; Lab opens `/lab` with both Purdue Bar Lines and Charades. Returning home restores the selected card and skips the entrance during the same tab session.

### Exact timing targets

| Opening part | Duration | Elapsed range | Intended action |
| --- | ---: | --- | --- |
| Button pulses | 450 ms | 0–450 ms | Two compact pulses; immediate response to activation. |
| Expansion and blackout | 650 ms | 450–1,100 ms | Text disappears, button grows beyond viewport, white transitions to black. |
| Darkness | 250 ms | 1,100–1,350 ms | A short suspense beat. |
| Camera push | 1,650 ms | 1,350–3,000 ms | Actual camera movement through the room, easing into framing. |
| Settle and controls | 450 ms | 3,000–3,450 ms | Camera settles; arrows appear during the final 200 ms. |

The nominal opening is 3.45 seconds (approximately 3.5 seconds). Load the scene behind the white entrance; first scene readiness can extend the dark hold. After a five-second scene-load timeout or renderer failure, expose the functional fallback.

| Card exchange part | Duration | Elapsed range | Intended action |
| --- | ---: | --- | --- |
| Lamp off | 100 ms | 0–100 ms | Spotlight, bulb emission, and visible beam switch off together. |
| Card exchange | 380 ms | 100–480 ms | Outgoing and incoming physical cards translate through near darkness. |
| Hold | 100 ms | 480–580 ms | New card is stationary; lamp remains off. |
| Ignition | 520 ms | 580–1,100 ms | Weak return, one brief dip, then steady illumination. |

Use restrained deterministic ignition, never strobing or full-screen white flashes. Opening content and returning to the room take approximately 200 ms. No autoplay audio or jump scares were included in the approved plan.

## Implementation contract

### Rendering and sequence

- Use direct Three.js in a dynamically imported client component. Keep the initial white entrance server-renderable. React owns semantic navigation and content; one render clock controls the camera, card movement, and every lamp-related light effect without per-frame React rerenders.
- Model the room, cable, metal lamp housing/rim/reflector/bulb, and physical cards locally. Use credible material roughness and normal variation. Procedural detail or properly licensed local textures are acceptable; preserve credits. Do not add an external 3D-model dependency.
- Use a perspective camera, one shadow-casting spotlight, minimal ambient/bounced light, and restrained beam haze. Card titles and emblems use non-emissive surfaces so they share the blackout. A faint spatial silhouette is acceptable; floating bright UI artwork is not.
- Maintain explicit entrance, expanding, black, revealing, ready, and switching phases (equivalent internal grouping is acceptable). Ignore further navigation during a switch, and disable card activation while switching. No queued transitions or out-of-order callbacks.
- Keep scene composition responsive with the lamp, whole square card, and arrows visible. Pause hidden-page rendering and dispose of all resources/listeners on unmount. Avoid expensive full-screen postprocessing; cap pixel ratio and shadow resolution and reduce nonessential effects when sustained performance is poor.

### Content, access, and compatibility

- About uses existing, supportable resume facts and contact URLs; do not invent biography details. Use an accessible modal with Close/Escape and focus restoration. Keep frontend copy minimal.
- Resume keeps the existing resume and chat. Lab retains Charades and adds Purdue Bar Lines using the verified existing project destination. Do not replace either experience with a placeholder.
- Use actual HTML actions with mouse, touch, Tab/Enter, and focused carousel arrow-key support. Provide 44 px or larger touch targets, safe-area handling, useful accessible names, and an announcement only when a card settles.
- The room's Back action returns to the clean white entrance, including from the static fallback, with focus on `click here`. It resets navigation/sequence/session state so re-entry works reliably without duplicate listeners or stranded timers. Returning from Resume/Lab still restores the room as planned; the explicit room Back action is how visitors replay the entrance.
- Respect reduced motion with brief fades, no camera dolly/card slide/flicker/dust, and the same destinations. WebGL initialization failure, context loss, or load timeout must yield an operational HTML carousel. Unavailable session storage cannot block entry or navigation.
- Preserve the prior OpenAI migration and existing server-side key handling. No new backend, database, or public API is required. Never copy `.env` contents, keys, tokens, account secrets, or credentials into commits, docs, screenshots, messages, or cloud prompts.

## Required iteration and evidence

The existing code is authoritative. Previous assertions, generated plans, a green build, and a screenshot file's mere existence are insufficient proof of completion.

1. Research primary-source professional cinematography/design and current official Three.js guidance. Record source URLs and the specific decisions they inform. Apply the user's Emil Kowalski design-engineering preference; if those skills are available, read and use them. Evaluate artistic recommendations separately from confirmed implementation facts.
2. Implement, run the website, exercise it in Playwright, and actually inspect the captured images and animation recording. Compare the rendered lamp, light falloff, materials, shadows, haze, camera path, timing, typography, card scale, and mobile framing against the brief.
3. Make another concrete pass for defects or artificial-looking details, then render and inspect again. Record changes and the evidence that caused them. Do not declare cinematic realism solely from source inspection or automated assertions.
4. Verify every acceptance row in the handoff against final current-state files, runtime behavior, screenshots, timing output, and test logs. Report available hardware limits honestly; do not claim mobile GPU validation from a resized desktop viewport.
5. Hand off at a reproducible stopping point with the entire objective, exact revision/artifacts, current evidence, remaining gaps, and runnable commands. Keep the goal active until all original requirements are proven fulfilled. Deployment remains separate after visual review.

## Goal continuation for every agent

Before working, read this file and the latest handoff. Carry this complete objective into any delegated prompt, even when that agent owns only a bounded subtask. Shared agents must have disjoint source ownership or coordinate before editing the same files.

If the destination provides goal tools, call `get_goal`. If there is no active goal, create one using the verbatim objective above and no invented token budget. If another unfinished goal exists, do not silently overwrite it; keep the goal record in this repository and report that state to the coordinating agent. A repository document does not automatically instantiate a cloud goal.

Each continuation must produce code, evidence that changes the next action, or a verified wait on an actually live handle. Treat a timeout as a need to recheck that same handle rather than automatically restarting work. Do not mark complete at a handoff, on subjective effort alone, or because tests pass while visual proof is missing. Mark a genuine blocker only after the same inability to progress recurs for at least three consecutive goal turns with no remaining independent useful work. Completion requires the full acceptance audit, followed by the goal completion tool when available.
