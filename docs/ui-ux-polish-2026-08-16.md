# UI/UX Polish Pass — 2026-08-16

## Evidence state

This pass is **implemented but runtime-unverified** in the current execution
environment. The existing Gate 0 simulation-core verification remains valid
because no solver, RNG, checkpoint, scale, particle-budget, lens equation, or
simulation command implementation was changed. Existing visual/performance
unknowns remain unknown: rendered imagery, real frame rate/GPU time, Tier B/C,
Safari/Firefox, mobile, and the BUILD_SPEC 39.3 human review.

Full repository gates that must be rerun on a machine with the pinned project
dependencies are `bun run test`, `bun run test:e2e`, and the repository build.

## Exactly 25 implemented UI/UX improvements

1. Peek instruments now use semantic regions and definition-list data structure.
2. Peek placement measures its real bounds and clamps to the visual viewport.
3. Peek layout reflows for narrow screens instead of crushing two columns.
4. Transient Peek and tool-wheel surfaces are mutually exclusive.
5. A/B/C fidelity badges expose their full meaning to assistive technology.
6. Radial wheel hover/focus feedback preserves each button's radial translation.
7. Radial wheel radius and center adapt to viewport size and safe screen margins.
8. Radial wheel supports roving focus, arrows, Home, End, and Escape.
9. Transient focus is returned to the previous control when the surface closes.
10. `Shift+H` provides a real opt-in Persistent Controls accessibility path.
11. Persistent Controls preference is remembered in localStorage with safe fallback.
12. Persistent pause state has live Play/Pause text and `aria-pressed`; Swap disables when unavailable.
13. Persistent Controls use 44 px minimum touch targets and overflow safely on narrow screens.
14. Native Tab navigation enters Persistent Controls and focus returns to the scene when the strip is disabled.
15. Browser zoom is no longer disabled by viewport metadata.
16. Touch-action suppression is scoped to the scene canvas rather than revealed DOM controls.
17. The scene canvas is keyboard-focusable, visibly focused, and accessibly named.
18. Boot progress exposes determinate progress semantics and live loading copy.
19. High-contrast/forced-colors preferences replace translucent treatment with legible opaque surfaces.
20. Reduced-motion changes are observed live and applied to DOM motion and camera easing.
21. Screen-reader event announcements use a dedicated atomic live region with duplicate-throttling.
22. Blocking failures use a labelled modal alert dialog with focus containment and retry focus.
23. Pointer interaction uses a drag-intent threshold so stationary long press does not mutate the object beneath it.
24. Interrupted gestures, auxiliary mouse buttons, blur, and visibility loss now cancel without accidental release actions.
25. Held Peek ownership and keyboard shortcut routing are cleaned up so chorded Peeks, H/Escape, and focused UI controls cannot leave stale effects or trigger scene commands incorrectly.

## Bugs repaired

- Field-node Inspector now looks up the selected node ID correctly.
- The WebGL context-loss listener is removed during App disposal.
- The drag-intent refactor preserves simple tap selection via a dedicated select intent.
- A draft recursive held-Peek cleanup regression and a draft `DOM.Iterable` assumption were caught and fixed before delivery.

## Source-level validation completed

- Strict TypeScript check passed for `src/ui/Overlay.ts` and `src/interaction/InputRouter.ts` using ES2022 + DOM libs.
- TypeScript syntax transpilation passed for Overlay, InputRouter, main entrypoint, and the expanded Playwright E2E source.
- Static HTML audit passed for duplicate IDs, browser-zoom policy, scene-only touch-action, boot progress semantics, and live-region ownership.
- Conflict-marker and trailing-whitespace scan found no changed-file defects.
- The rebuilt `src/app/App.ts` was compared against the baseline Git tree: only the intended select hook, Inspector fix, listener cleanup, and help-row addition differ.

## Operational-state delta

Treat this pass as **implemented-but-unverified** until the full repository and
browser gates pass. Do not supersede VER-002 or the historical evidence behind
VER-003; the changed UI/input paths require fresh verification before their new
behavior can be promoted to verified. Do not close UNK-001, UNK-002, or UNK-003.
