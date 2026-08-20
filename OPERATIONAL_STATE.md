# Operational State: Event Horizon Forge

<!-- operational-state:metadata
{
  "artifact_path": "",
  "current_baseline": {
    "identity": "runtime baseline ed223a403dd7e60cf2bbab2f7120ba5d05b779f2 - adaptive rendering and hot-path performance refactor; matched real-device stability pending",
    "last_verified": "2026-08-20",
    "state": "implemented-unverified"
  },
  "delivery_state": "crash-safety-and-performance-refactor-implemented-real-device-verification-pending",
  "last_updated": "2026-08-20T10:23:54Z",
  "linked_parent_state": null,
  "primary_artifact": "src/ Gate 0 prototype + BUILD_SPEC.md",
  "project_id": "event-horizon-forge",
  "project_name": "Event Horizon Forge",
  "project_root": "https://github.com/westkitty/Event-Horizon-Forge",
  "schema_version": 1,
  "scope_boundaries": [
    "Canonical repository westkitty/Event-Horizon-Forge",
    "Browser-first Event Horizon Forge simulation"
  ],
  "state_revision": 6,
  "target_environment": "Browser-first TypeScript/Three.js; production expansion remains Gate-0-gated"
}
-->

## 1. Project Identity and Scope

- **Project ID:** `event-horizon-forge`
- **Purpose:** Keep one implementation-safe source of truth for Event Horizon Forge.
- **Primary root:** `https://github.com/westkitty/Event-Horizon-Forge`
- **Authority:** current user instruction, this state, `BUILD_SPEC.md`, `docs/master-build-contract.md`, then verified evidence.

## 2. Current Baseline

- **Runtime application baseline:** `ed223a403dd7e60cf2bbab2f7120ba5d05b779f2` — adaptive rendering and hot-path performance refactor on top of the crash-safety baseline; matched real-device stability remains pending.
- **Built:** Gate 0 prototype, August 16 UI/UX polish, August 17 UI/input repairs, August 20 crash-safety controls, adaptive framebuffer quality, allocation-free camera hot paths, and cached magnetic field-line topology.
- **Verified:** governance, historical unchanged solver/RNG evidence, bounded direct-Chromium UI/input repairs, focused crash-safety logic checks, adaptive-resolution harness checks, and focused strict interface typechecks for the new performance paths.
- **Unverified on current main:** full pinned tests/typecheck/build/E2E, the previously crashing visible-browser path, measured benefit of this refactor, rendered imagery, real frame-time/GPU timing, Tier B/C, Safari/Firefox/mobile, and human Gate 0 review.
- **Gate verdict:** `INSUFFICIENT EVIDENCE`; production expansion remains gated.

## 3. Artifact Contract

Build the one-scene browser simulation governed by `BUILD_SPEC.md` and `docs/master-build-contract.md`. The rendered universe remains the interface. Runtime claims require matching runtime evidence.

## 4. Active Invariants

<!-- operational-state:entry
{
  "authority": "Explicit user instruction + BUILD_SPEC.md",
  "id": "INV-001",
  "recheck_trigger": "Any UI/input/camera/time/onboarding change",
  "rule": "Ordinary play must not depend on persistent dashboard chrome. Core actions stay scene-native and transient; explicit accessibility controls are the allowed exception.",
  "scope": "Primary user journey and UI/input work",
  "state": "requested",
  "title": "The rendered universe is the interface",
  "validation_method": "Walk Gate 0 with persistent controls off and complete the core path without a pinned dashboard."
}
-->
### INV-001 — The rendered universe is the interface

- **State:** `requested`
- **Authority:** Explicit user instruction + BUILD_SPEC.md
- **Recheck Trigger:** Any UI/input/camera/time/onboarding change
- **Rule:** Ordinary play must not depend on persistent dashboard chrome. Core actions stay scene-native and transient; explicit accessibility controls are the allowed exception.
- **Scope:** Primary user journey and UI/input work
- **Validation Method:** Walk Gate 0 with persistent controls off and complete the core path without a pinned dashboard.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "authority": "BUILD_SPEC.md",
  "id": "INV-002",
  "recheck_trigger": "Subsystem architecture change",
  "rule": "Formation, plasma/magnetic work, instability, and black-hole interaction share provenance, camera, time, scale, branching, save, and interaction systems.",
  "scope": "Simulation architecture",
  "state": "requested",
  "title": "Formation, plasma, and collapse remain one simulation",
  "validation_method": "Cross-domain provenance integration test."
}
-->
### INV-002 — Formation, plasma, and collapse remain one simulation

- **State:** `requested`
- **Authority:** BUILD_SPEC.md
- **Recheck Trigger:** Subsystem architecture change
- **Rule:** Formation, plasma/magnetic work, instability, and black-hole interaction share provenance, camera, time, scale, branching, save, and interaction systems.
- **Scope:** Simulation architecture
- **Validation Method:** Cross-domain provenance integration test.
<!-- /operational-state:entry -->

## 5. Verified Working Behavior

<!-- operational-state:entry
{
  "artifact_revision": "main at revision 5",
  "capability": "Required governance and build-contract files are present in westkitty/Event-Horizon-Forge main.",
  "evidence": "GitHub connector read of current repository metadata and governance paths.",
  "freshness": "Current",
  "id": "VER-001",
  "last_verified": "2026-08-18",
  "recheck_trigger": "Governance path, branch, or remote change",
  "scope": "Repository governance only",
  "state": "verified",
  "title": "Canonical repository governance bootstrap is present",
  "verification_method": "GitHub repository/file read"
}
-->
### VER-001 — Canonical repository governance bootstrap is present

- **State:** `verified`
- **Artifact Revision:** main at revision 5
- **Capability:** Required governance and build-contract files are present in westkitty/Event-Horizon-Forge main.
- **Evidence:** GitHub connector read of current repository metadata and governance paths.
- **Freshness:** Current
- **Last Verified:** 2026-08-18
- **Recheck Trigger:** Governance path, branch, or remote change
- **Scope:** Repository governance only
- **Verification Method:** GitHub repository/file read
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "artifact_revision": "Gate 0 2026-08-12; solver/RNG source unchanged through runtime commit 00b41e8dd19b7798cbd9eb085e124de9dc98d4e5",
  "capability": "Historical Gate 0 deterministic solver/RNG physics tests passed for field, Boris plasma, gravity, equilibrium, and tidal disruption. This verified scope explicitly excludes the changed checkpoint-retention and wall-clock catch-up paths.",
  "evidence": "42 passing unit tests on the 2026-08-12 Gate 0 baseline plus current diff inspection showing the physical solvers/RNG were not changed by the crash-safety repair.",
  "freshness": "Applicable to unchanged solver/RNG physics only",
  "id": "VER-002",
  "last_verified": "2026-08-12",
  "recheck_trigger": "Solver/RNG/command-application change",
  "scope": "Simulation physics layer only; excludes checkpoint retention, rewind integration, wall-clock scheduling, and rendering",
  "state": "verified",
  "title": "Unchanged simulation physics core retains historical deterministic evidence",
  "verification_method": "Historical bun run test plus source-scope comparison"
}
-->
### VER-002 — Unchanged simulation physics core retains historical deterministic evidence

- **State:** `verified`
- **Artifact Revision:** Gate 0 2026-08-12; solver/RNG source unchanged through runtime commit 00b41e8dd19b7798cbd9eb085e124de9dc98d4e5
- **Capability:** Historical Gate 0 deterministic solver/RNG physics tests passed for field, Boris plasma, gravity, equilibrium, and tidal disruption. This verified scope explicitly excludes the changed checkpoint-retention and wall-clock catch-up paths.
- **Evidence:** 42 passing unit tests on the 2026-08-12 Gate 0 baseline plus current diff inspection showing the physical solvers/RNG were not changed by the crash-safety repair.
- **Freshness:** Applicable to unchanged solver/RNG physics only
- **Last Verified:** 2026-08-12
- **Recheck Trigger:** Solver/RNG/command-application change
- **Scope:** Simulation physics layer only; excludes checkpoint retention, rewind integration, wall-clock scheduling, and rendering
- **Verification Method:** Historical bun run test plus source-scope comparison
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "artifact_revision": "e83dedc45813573585eda560accffc3529bee0d9 + test-only fa87d3e074f775a54ffc22adc2412787401063cf",
  "capability": "Persistent-control dispatch, Shift+H repeat guard, touch escalation cancellation, BFCache listener preservation, Peek cleanup, pointer cancellation, focus/navigation, and Overlay accessibility passed bounded Chromium harnesses.",
  "evidence": "docs/bug-sweep-2026-08-17.md plus exact current GitHub source-blob identity checks.",
  "freshness": "Current for bounded repair scope",
  "id": "VER-004",
  "last_verified": "2026-08-17",
  "recheck_trigger": "InputRouter/main/Overlay interaction or lifecycle change",
  "scope": "Bounded UI/input behavior only",
  "state": "verified",
  "title": "UI/input regression repairs pass direct Chromium runtime checks",
  "verification_method": "Direct Chromium runtime harnesses"
}
-->
### VER-004 — UI/input regression repairs pass direct Chromium runtime checks

- **State:** `verified`
- **Artifact Revision:** e83dedc45813573585eda560accffc3529bee0d9 + test-only fa87d3e074f775a54ffc22adc2412787401063cf
- **Capability:** Persistent-control dispatch, Shift+H repeat guard, touch escalation cancellation, BFCache listener preservation, Peek cleanup, pointer cancellation, focus/navigation, and Overlay accessibility passed bounded Chromium harnesses.
- **Evidence:** docs/bug-sweep-2026-08-17.md plus exact current GitHub source-blob identity checks.
- **Freshness:** Current for bounded repair scope
- **Last Verified:** 2026-08-17
- **Recheck Trigger:** InputRouter/main/Overlay interaction or lifecycle change
- **Scope:** Bounded UI/input behavior only
- **Verification Method:** Direct Chromium runtime harnesses
<!-- /operational-state:entry -->

## 6. Known Not Working

The following catastrophic runtime failure is confirmed by user report. Repair code is implemented, but matched validation on the previously failing machine is still pending.

<!-- operational-state:entry
{
  "affected_user_path": "Normal visible-browser startup and sustained playback",
  "artifact_revision": "runtime baseline fa87d3e074f775a54ffc22adc2412787401063cf as carried by main before the 2026-08-20 repair",
  "evidence": "Explicit user report 2026-08-20. Source inspection independently found unvalidated full-screen geodesic/DPR/particle load and checkpoint retention capable of extreme GPU and RAM pressure.",
  "id": "BRK-001",
  "observed_failure": "On the pre-repair runtime baseline, attempting to run Event Horizon Forge can crash the browser and make the entire host computer become impossibly slow.",
  "required_repair": "Implemented in runtime commit 00b41e8dd19b7798cbd9eb085e124de9dc98d4e5: hard physical-pixel caps, substantially reduced default geodesic/particle budgets, 32 MiB checkpoint cap per branch, one-second default checkpoint interval, bounded stalled-frame catch-up, and resize-time pixel-cap enforcement.",
  "required_validation": "Matched visible-browser run on the previously failing machine: responsive boot, at least ten minutes representative use, rewind/fork/compare, bounded checkpoint memory, and no browser/GPU/system stall.",
  "severity": "critical",
  "state": "known-broken",
  "status": "repair-implemented-validation-pending",
  "title": "Runtime can crash the browser and stall the host computer",
  "workaround": "Do not use the pre-repair runtime baseline for normal play."
}
-->
### BRK-001 — Runtime can crash the browser and stall the host computer

- **State:** `known-broken`
- **Affected User Path:** Normal visible-browser startup and sustained playback
- **Artifact Revision:** runtime baseline fa87d3e074f775a54ffc22adc2412787401063cf as carried by main before the 2026-08-20 repair
- **Evidence:** Explicit user report 2026-08-20. Source inspection independently found unvalidated full-screen geodesic/DPR/particle load and checkpoint retention capable of extreme GPU and RAM pressure.
- **Observed Failure:** On the pre-repair runtime baseline, attempting to run Event Horizon Forge can crash the browser and make the entire host computer become impossibly slow.
- **Required Repair:** Implemented in runtime commit 00b41e8dd19b7798cbd9eb085e124de9dc98d4e5: hard physical-pixel caps, substantially reduced default geodesic/particle budgets, 32 MiB checkpoint cap per branch, one-second default checkpoint interval, bounded stalled-frame catch-up, and resize-time pixel-cap enforcement.
- **Required Validation:** Matched visible-browser run on the previously failing machine: responsive boot, at least ten minutes representative use, rewind/fork/compare, bounded checkpoint memory, and no browser/GPU/system stall.
- **Severity:** critical
- **Status:** repair-implemented-validation-pending
- **Workaround:** Do not use the pre-repair runtime baseline for normal play.
<!-- /operational-state:entry -->

## 7. Implemented but Unverified

<!-- operational-state:entry
{
  "artifact_revision": "ed223a403dd7e60cf2bbab2f7120ba5d05b779f2",
  "id": "UNV-001",
  "implemented": "Gate 0, prior UI/input repairs, crash-safety controls, adaptive framebuffer quality, allocation-free camera hot paths, and cached field-line topology exist on current main.",
  "missing_evidence": "Pinned full-repository unit tests, TypeScript build, Vite build/E2E, matched visible-browser stability on the user's failing machine, and measured before/after frame-time evidence for the refactor.",
  "recheck_trigger": "Any source/dependency/build/performance-budget/render-loop/camera/field-line change",
  "scope": "Current runtime full-application integration",
  "state": "implemented-unverified",
  "title": "Current runtime full application integration after performance refactor",
  "validation_needed": "Run bun run test, bun run typecheck, bun run build, bun run test:e2e, then the matched visible-browser stability/performance run with frame-time distributions."
}
-->
### UNV-001 — Current runtime full application integration after performance refactor

- **State:** `implemented-unverified`
- **Artifact Revision:** ed223a403dd7e60cf2bbab2f7120ba5d05b779f2
- **Implemented:** Gate 0, prior UI/input repairs, crash-safety controls, adaptive framebuffer quality, allocation-free camera hot paths, and cached field-line topology exist on current main.
- **Missing Evidence:** Pinned full-repository unit tests, TypeScript build, Vite build/E2E, matched visible-browser stability on the user's failing machine, and measured before/after frame-time evidence for the refactor.
- **Recheck Trigger:** Any source/dependency/build/performance-budget/render-loop/camera/field-line change
- **Scope:** Current runtime full-application integration
- **Validation Needed:** Run bun run test, bun run typecheck, bun run build, bun run test:e2e, then the matched visible-browser stability/performance run with frame-time distributions.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "artifact_revision": "ed223a403dd7e60cf2bbab2f7120ba5d05b779f2",
  "id": "UNV-002",
  "implemented": "Crash-safety controls remain in force and the runtime now also adapts framebuffer ratio downward from the hard ceiling on sustained low FPS, cautiously recovers only after sustained healthy throughput, removes transient Three.js allocations and redundant projection work from the camera hot path, and caches RK4 magnetic field-line topology so steady camera movement only reprojects vertices.",
  "missing_evidence": "The decisive real-device path that previously crashed has not yet been rerun, full project dependencies are unavailable in this execution environment, and no matched before/after runtime profile has measured the new refactor.",
  "recheck_trigger": "AdaptiveResolution, render-budget, lens, particle, checkpoint, branch, time-controller, renderer-resolution, CameraController, FieldLines, or device-tier change",
  "scope": "GPU/CPU/RAM crash-safety and steady-frame performance controls",
  "state": "implemented-unverified",
  "title": "Crash-safety and steady-frame performance refactor is implemented",
  "validation_needed": "Visible-browser ten-minute matched run with p50/p95/p99/max frame-time distribution, adaptive render ratio observations, browser/OS responsiveness, GPU/device-loss observation, and checkpoint-retained-byte checks."
}
-->
### UNV-002 — Crash-safety and steady-frame performance refactor is implemented

- **State:** `implemented-unverified`
- **Artifact Revision:** ed223a403dd7e60cf2bbab2f7120ba5d05b779f2
- **Implemented:** Crash-safety controls remain in force and the runtime now also adapts framebuffer ratio downward from the hard ceiling on sustained low FPS, cautiously recovers only after sustained healthy throughput, removes transient Three.js allocations and redundant projection work from the camera hot path, and caches RK4 magnetic field-line topology so steady camera movement only reprojects vertices.
- **Missing Evidence:** The decisive real-device path that previously crashed has not yet been rerun, full project dependencies are unavailable in this execution environment, and no matched before/after runtime profile has measured the new refactor.
- **Recheck Trigger:** AdaptiveResolution, render-budget, lens, particle, checkpoint, branch, time-controller, renderer-resolution, CameraController, FieldLines, or device-tier change
- **Scope:** GPU/CPU/RAM crash-safety and steady-frame performance controls
- **Validation Needed:** Visible-browser ten-minute matched run with p50/p95/p99/max frame-time distribution, adaptive render ratio observations, browser/OS responsiveness, GPU/device-loss observation, and checkpoint-retained-byte checks.
<!-- /operational-state:entry -->

## 8. Unknown or Evidence-Stale State

<!-- operational-state:entry
{
  "artifact_revision": "pre-polish Gate 0 2026-08-12",
  "capability": "The 2026-08-12 Gate 0 build passed a real Chromium Tier A E2E path for boot, zero chrome, pause/camera, rewind, branching, and Peek behavior.",
  "evidence": "Chromium 151 / Apple M1 result from 2026-08-12.",
  "freshness": "Stale for current main because later commits changed UI/input/main behavior",
  "id": "VER-003",
  "last_verified": "2026-08-12",
  "recheck_trigger": "UI/input/camera/time/branch/capability change",
  "scope": "Historical artifact only; not current-main integration proof",
  "state": "evidence-stale",
  "title": "Historical zero-chrome boot, time, rewind and branching browser evidence",
  "verification_method": "Historical bun run test:e2e; rerun on current main"
}
-->
### VER-003 — Historical zero-chrome boot, time, rewind and branching browser evidence

- **State:** `evidence-stale`
- **Artifact Revision:** pre-polish Gate 0 2026-08-12
- **Capability:** The 2026-08-12 Gate 0 build passed a real Chromium Tier A E2E path for boot, zero chrome, pause/camera, rewind, branching, and Peek behavior.
- **Evidence:** Chromium 151 / Apple M1 result from 2026-08-12.
- **Freshness:** Stale for current main because later commits changed UI/input/main behavior
- **Last Verified:** 2026-08-12
- **Recheck Trigger:** UI/input/camera/time/branch/capability change
- **Scope:** Historical artifact only; not current-main integration proof
- **Verification Method:** Historical bun run test:e2e; rerun on current main
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "id": "UNK-001",
  "impact": "Lensing, disk, tidal deformation, star field, and BUILD_SPEC visual rejection criteria remain unverified.",
  "last_checked": "2026-08-18",
  "missing_evidence": "No reliable visible current-main render observation exists.",
  "resolution": "Open current main in a visible real browser and inspect it.",
  "state": "unknown",
  "title": "Rendered image has never been observed"
}
-->
### UNK-001 — Rendered image has never been observed

- **State:** `unknown`
- **Impact:** Lensing, disk, tidal deformation, star field, and BUILD_SPEC visual rejection criteria remain unverified.
- **Last Checked:** 2026-08-18
- **Missing Evidence:** No reliable visible current-main render observation exists.
- **Resolution:** Open current main in a visible real browser and inspect it.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "id": "UNK-002",
  "impact": "BUILD_SPEC performance targets are neither met nor refuted.",
  "last_checked": "2026-08-18",
  "missing_evidence": "No visible current-main median/p95 frame-time measurement exists.",
  "resolution": "Run current main with ?debug in a visible browser and record frame timing.",
  "state": "unknown",
  "title": "Frame rate has never been measured"
}
-->
### UNK-002 — Frame rate has never been measured

- **State:** `unknown`
- **Impact:** BUILD_SPEC performance targets are neither met nor refuted.
- **Last Checked:** 2026-08-18
- **Missing Evidence:** No visible current-main median/p95 frame-time measurement exists.
- **Resolution:** Run current main with ?debug in a visible browser and record frame timing.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "id": "UNK-003",
  "impact": "Fallback and cross-browser claims remain unverified.",
  "last_checked": "2026-08-18",
  "missing_evidence": "Current-main Tier B/C, Safari, Firefox, and mobile paths have not been exercised.",
  "resolution": "Run forced tiers and the intended browser/device matrix.",
  "state": "unknown",
  "title": "Tier B, Tier C and non-Chromium/mobile paths are untested"
}
-->
### UNK-003 — Tier B, Tier C and non-Chromium/mobile paths are untested

- **State:** `unknown`
- **Impact:** Fallback and cross-browser claims remain unverified.
- **Last Checked:** 2026-08-18
- **Missing Evidence:** Current-main Tier B/C, Safari, Firefox, and mobile paths have not been exercised.
- **Resolution:** Run forced tiers and the intended browser/device matrix.
<!-- /operational-state:entry -->

## 9. Pending Work

<!-- operational-state:entry
{
  "blocks_completion": true,
  "dependency": "Human-visible browser on the machine/browser that previously became unusable",
  "id": "PND-001",
  "priority": "highest",
  "reason_pending": "Gate 0 is built and a bounded crash-safety repair is implemented, but the reported catastrophic real-device failure has not yet been retested and rendered/performance evidence remains absent.",
  "state": "pending",
  "task": "First run the repaired runtime on the previously failing machine and prove responsive boot plus ten minutes of representative use. If stable, continue BUILD_SPEC 39.2/39.3 visual/performance/human review and issue GO / CONDITIONAL GO / NO-GO.",
  "title": "Verify crash-safety, then complete Gate 0 visible-browser verdict",
  "validation_needed": "No browser/system stall; frame-time distribution; bounded checkpoint memory; rewind/fork/compare; BUILD_SPEC 39.2/39.3 visual/performance/human review"
}
-->
### PND-001 — Verify crash-safety, then complete Gate 0 visible-browser verdict

- **State:** `pending`
- **Blocks Completion:** Yes
- **Dependency:** Human-visible browser on the machine/browser that previously became unusable
- **Priority:** highest
- **Reason Pending:** Gate 0 is built and a bounded crash-safety repair is implemented, but the reported catastrophic real-device failure has not yet been retested and rendered/performance evidence remains absent.
- **Task:** First run the repaired runtime on the previously failing machine and prove responsive boot plus ten minutes of representative use. If stable, continue BUILD_SPEC 39.2/39.3 visual/performance/human review and issue GO / CONDITIONAL GO / NO-GO.
- **Validation Needed:** No browser/system stall; frame-time distribution; bounded checkpoint memory; rewind/fork/compare; BUILD_SPEC 39.2/39.3 visual/performance/human review
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "blocks_completion": false,
  "id": "PND-002",
  "priority": "high",
  "reason_pending": "Crash-safe hard ceilings and a downward-first adaptive framebuffer controller are implemented, but real frame-time, adaptive-ratio behavior, simulation cost, and retained-memory behavior have not been measured on the target machine.",
  "state": "pending",
  "task": "Measure the current refactored baseline before increasing quality: record p50/p95/p99/max frame time, adaptive framebuffer ratio changes, checkpoint retained bytes, simulation cost, and camera/field-line interaction responsiveness. Only raise lens/particle budgets when matched evidence leaves safe headroom.",
  "title": "Measure refactored resource budgets before any quality promotion",
  "validation_needed": "Ten-minute matched performance/memory run with frame distribution, adaptive ratio history, simulation timing, and checkpoint retained bytes"
}
-->
### PND-002 — Measure refactored resource budgets before any quality promotion

- **State:** `pending`
- **Blocks Completion:** No
- **Priority:** high
- **Reason Pending:** Crash-safe hard ceilings and a downward-first adaptive framebuffer controller are implemented, but real frame-time, adaptive-ratio behavior, simulation cost, and retained-memory behavior have not been measured on the target machine.
- **Task:** Measure the current refactored baseline before increasing quality: record p50/p95/p99/max frame time, adaptive framebuffer ratio changes, checkpoint retained bytes, simulation cost, and camera/field-line interaction responsiveness. Only raise lens/particle budgets when matched evidence leaves safe headroom.
- **Validation Needed:** Ten-minute matched performance/memory run with frame distribution, adaptive ratio history, simulation timing, and checkpoint retained bytes
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "blocks_completion": false,
  "id": "PND-003",
  "priority": "medium",
  "reason_pending": "Deferred from Gate 0 and documented rather than faked.",
  "state": "pending",
  "task": "Implement depth-aware lens compositing for near-field matter or keep the limitation explicit.",
  "title": "Near-field matter is not lensed",
  "validation_needed": "Visible comparison after implementation/review."
}
-->
### PND-003 — Near-field matter is not lensed

- **State:** `pending`
- **Blocks Completion:** No
- **Priority:** medium
- **Reason Pending:** Deferred from Gate 0 and documented rather than faked.
- **Task:** Implement depth-aware lens compositing for near-field matter or keep the limitation explicit.
- **Validation Needed:** Visible comparison after implementation/review.
<!-- /operational-state:entry -->

## 10. Active Decisions, Defaults, and Prohibitions

<!-- operational-state:entry
{
  "authority": "Explicit user instruction + verified GitHub metadata",
  "evidence": "GitHub confirmed westkitty/Event-Horizon-Forge, default branch main, write permission, and fast-forward delivery of performance-refactor runtime ed223a403dd7e60cf2bbab2f7120ba5d05b779f2 on 2026-08-20.",
  "id": "DEC-001",
  "last_checked": "2026-08-20",
  "recheck_trigger": "Git workflow change",
  "rule": "Use https://github.com/westkitty/Event-Horizon-Forge.git with main. Do not replace the repo, silently change origin, force-push, or overwrite governance without evidence.",
  "scope": "Git workflow",
  "state": "current-baseline",
  "status": "active",
  "title": "Canonical repository and branch",
  "validation_method": "Check repo identity, branch, head, and fast-forward status after writes."
}
-->
### DEC-001 — Canonical repository and branch

- **State:** `current-baseline`
- **Authority:** Explicit user instruction + verified GitHub metadata
- **Evidence:** GitHub confirmed westkitty/Event-Horizon-Forge, default branch main, write permission, and fast-forward delivery of performance-refactor runtime ed223a403dd7e60cf2bbab2f7120ba5d05b779f2 on 2026-08-20.
- **Last Checked:** 2026-08-20
- **Recheck Trigger:** Git workflow change
- **Rule:** Use https://github.com/westkitty/Event-Horizon-Forge.git with main. Do not replace the repo, silently change origin, force-push, or overwrite governance without evidence.
- **Scope:** Git workflow
- **Status:** active
- **Validation Method:** Check repo identity, branch, head, and fast-forward status after writes.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "authority": "BUILD_SPEC performance budgets + 2026-08-20 catastrophic resource-failure evidence",
  "evidence": "Current implementation keeps the 650k/450k/300k physical-pixel tier caps as hard ceilings and adds a downward-first adaptive framebuffer controller with hysteretic recovery.",
  "id": "DEC-002",
  "last_checked": "2026-08-20",
  "recheck_trigger": "Adaptive-resolution, renderer-resolution, quality-tier, lens-budget, or performance-policy change",
  "rule": "Treat tier physical-pixel limits as hard ceilings, not quality targets. Runtime adaptation may reduce resolution under load and may recover only gradually within the ceiling. Do not remove these guards or promote lens/particle quality without matched real-device performance evidence.",
  "scope": "Performance quality policy",
  "state": "current-baseline",
  "status": "active",
  "title": "Performance safety outranks unmeasured maximum quality",
  "validation_method": "Matched visible-browser performance run must show responsive interaction and safe frame/memory behavior before any quality promotion."
}
-->
### DEC-002 — Performance safety outranks unmeasured maximum quality

- **State:** `current-baseline`
- **Authority:** BUILD_SPEC performance budgets + 2026-08-20 catastrophic resource-failure evidence
- **Evidence:** Current implementation keeps the 650k/450k/300k physical-pixel tier caps as hard ceilings and adds a downward-first adaptive framebuffer controller with hysteretic recovery.
- **Last Checked:** 2026-08-20
- **Recheck Trigger:** Adaptive-resolution, renderer-resolution, quality-tier, lens-budget, or performance-policy change
- **Rule:** Treat tier physical-pixel limits as hard ceilings, not quality targets. Runtime adaptation may reduce resolution under load and may recover only gradually within the ceiling. Do not remove these guards or promote lens/particle quality without matched real-device performance evidence.
- **Scope:** Performance quality policy
- **Status:** active
- **Validation Method:** Matched visible-browser performance run must show responsive interaction and safe frame/memory behavior before any quality promotion.
<!-- /operational-state:entry -->

## 11. Validation and Evidence Matrix

| ID | State | Decisive next check |
|---|---|---|
| INV-001 | requested | Gate 0 path with persistent chrome off |
| INV-002 | requested | Cross-domain provenance test |
| VER-001 | verified | Recheck after governance/remote change |
| VER-002 | verified | Re-run after simulation-core change |
| VER-003 | evidence-stale | Re-run current E2E |
| VER-004 | verified | Recheck after UI/input lifecycle change |
| BRK-001 | known-broken | Matched repaired visible-browser run with no browser/system stall |
| UNV-001 | implemented-unverified | tests + typecheck + build + E2E + matched stability run |
| UNV-002 | implemented-unverified | Ten-minute failing-machine run with frame/adaptive-ratio/memory evidence |
| UNK-001 | unknown | visible-browser render inspection |
| UNK-002 | unknown | visible ?debug frame timing |
| UNK-003 | unknown | forced tiers + browser/device matrix |
| PND-001 | pending | Crash-safety verification, then BUILD_SPEC 39.2/39.3 review |
| PND-002 | pending | Measure refactored frame/adaptive-ratio/sim/memory budgets before quality promotion |
| PND-003 | pending | visible lens-compositing comparison |
| DEC-001 | current-baseline | repo/head verification |
| DEC-002 | current-baseline | matched performance proof before quality promotion |

## 12. Current Change Scope and Impact Radius

- **Allowed now:** crash-safety validation, bounded evidence-led performance repair, repository test/build evidence, and Gate 0 evidence collection.
- **Protected:** real null-geodesic lensing, one-universe simulation architecture, rewind/fork/compare semantics, screen-first interaction, scientific-fidelity boundaries, canonical repository/branch, and unaffected solver/RNG behavior.
- **Current runtime:** `ed223a403dd7e60cf2bbab2f7120ba5d05b779f2` retains the crash-safety ceilings and adds adaptive framebuffer reduction/recovery, allocation-free camera frame work, and cached field-line topology/reprojection.
- **Performance guardrail:** adaptive resolution may only operate within the existing crash-safe hard ceiling; quality promotion requires matched real-device evidence.
- **Before the crash is called fixed:** rerun the previously failing visible-browser path and observe responsive boot plus at least ten minutes of representative use without browser/GPU/system stall.
- **Before this performance refactor is called an improvement:** capture matched before/after p50/p95/p99/max frame timing and observe adaptive ratio behavior on a visible target browser.
- **Before current main is called fully verified:** additionally run repository tests/typecheck/build/E2E and the BUILD_SPEC 39.2/39.3 visual/performance/human Gate 0 review.

## 13. Compact Revision Log

### Revision 1 - 2026-08-12T09:27:36Z
- Initialized operational state.

### Revision 2 - 2026-08-12T09:27:59Z
- Established canonical repository, invariants, pending Gate 0 work, and Git protections.

### Revision 3 - 2026-08-12T09:35:45Z
- Verified repository governance bootstrap.

### Revision 4 - 2026-08-12T15:20:00Z
- Recorded Gate 0 implementation, 42 unit-test passes, historical Chromium Tier A E2E evidence, carried conditions, and visual/performance/browser unknowns.

### Revision 5 - 2026-08-18T04:28:57Z
- Repaired malformed managed-entry renderings and stale PND-001 bootstrap state.
- Marked the old full-browser VER-003 evidence stale for current main.
- Added VER-004 for bounded UI/input runtime proof and UNV-001 for the unrun full current-main application gate.
- Preserved visual, performance, fallback, cross-browser/mobile, and human-review unknowns.
- No application runtime code changed.

### Revision 6 — 2026-08-20T10:23:54Z

- **Artifact/source identity:** performance-refactor runtime `ed223a403dd7e60cf2bbab2f7120ba5d05b779f2` delivered on main
- **State deltas:** Promoted the user-reported catastrophic runtime failure into BRK-001; narrowed VER-002 to unaffected historical solver/RNG scope; updated UNV-001/UNV-002 for crash-safety plus adaptive/camera/field-line performance work; updated PND-001/PND-002; added DEC-002; refreshed validation matrix and impact radius.
- **New evidence:** Explicit user report on 2026-08-20 that the pre-repair runtime crashed the browser and stalled the host; source inspection of crash-inducing render/checkpoint load; focused crash-safety tests; direct adaptive-resolution executable harness; strict interface typechecks for AdaptiveResolution, CameraController, FieldLines, and main integration; source-level refactor preserving the physical lens and field model.
- **Newly verified behavior:** None promoted to end-to-end runtime verified; focused implementation checks passed only within their bounded scopes.
- **Newly known failure:** BRK-001 remains known-broken until matched repaired visible-browser validation passes.
- **New decision:** DEC-002 makes crash-safe pixel caps hard ceilings and requires matched evidence before quality promotion.
- **Validation not performed:** Full pinned project unit/typecheck/build/E2E commands remain unavailable in this container because repository dependencies are absent and outbound package/GitHub DNS access is blocked; no matched visible-browser before/after performance profile; no ten-minute real-device stability run.
- **Summary:** Record catastrophic resource failure, preserve crash-safe caps, and add adaptive framebuffer, allocation-free camera, and cached field-topology performance controls without weakening simulation fidelity.
