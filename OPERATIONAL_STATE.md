# Operational State: Event Horizon Forge

<!-- operational-state:metadata
{
  "artifact_path": "",
  "current_baseline": {
    "identity": "runtime baseline fa87d3e074f775a54ffc22adc2412787401063cf - Gate 0 prototype with UI/input regression repairs; governance revision 5 applied on main",
    "last_verified": "2026-08-17",
    "state": "current-baseline"
  },
  "delivery_state": "gate-0-built-ui-input-repaired-full-current-gate-pending",
  "last_updated": "2026-08-18T04:28:57Z",
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
  "state_revision": 5,
  "target_environment": "Browser-first TypeScript/Three.js; production expansion remains Gate-0-gated"
}
-->

## 1. Project Identity and Scope

- **Project ID:** `event-horizon-forge`
- **Purpose:** Keep one implementation-safe source of truth for Event Horizon Forge.
- **Primary root:** `https://github.com/westkitty/Event-Horizon-Forge`
- **Authority:** current user instruction, this state, `BUILD_SPEC.md`, `docs/master-build-contract.md`, then verified evidence.

## 2. Current Baseline

- **Runtime application baseline:** `fa87d3e074f775a54ffc22adc2412787401063cf`; revision 5 changes governance only and leaves runtime code unchanged.
- **Built:** Gate 0 prototype plus the August 16 UI/UX polish and August 17 UI/input repairs.
- **Verified:** governance, historical deterministic simulation-core evidence, and bounded direct-Chromium UI/input repairs.
- **Unverified on current main:** full tests/typecheck/build/E2E, rendered imagery, real frame time/GPU timing, Tier B/C, Safari/Firefox/mobile, and human Gate 0 review.
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
  "artifact_revision": "Gate 0 2026-08-12",
  "capability": "Historical Gate 0 deterministic simulation-core tests passed for RNG, rewind/replay, field, Boris plasma, gravity, equilibrium, and tidal disruption.",
  "evidence": "42 passing unit tests on the 2026-08-12 Gate 0 baseline; later UI/input repairs did not change solver/RNG/checkpoint code.",
  "freshness": "Applicable until simulation-core code changes",
  "id": "VER-002",
  "last_verified": "2026-08-12",
  "recheck_trigger": "Solver/RNG/checkpoint/command-order change",
  "scope": "Simulation layer only",
  "state": "verified",
  "title": "Simulation core is deterministic and physically validated",
  "verification_method": "Historical bun run test"
}
-->
### VER-002 — Simulation core is deterministic and physically validated

- **State:** `verified`
- **Artifact Revision:** Gate 0 2026-08-12
- **Capability:** Historical Gate 0 deterministic simulation-core tests passed for RNG, rewind/replay, field, Boris plasma, gravity, equilibrium, and tidal disruption.
- **Evidence:** 42 passing unit tests on the 2026-08-12 Gate 0 baseline; later UI/input repairs did not change solver/RNG/checkpoint code.
- **Freshness:** Applicable until simulation-core code changes
- **Last Verified:** 2026-08-12
- **Recheck Trigger:** Solver/RNG/checkpoint/command-order change
- **Scope:** Simulation layer only
- **Verification Method:** Historical bun run test
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

No unresolved confirmed runtime defect is currently recorded after the bounded August 17 repair sweep. Unknown and unverified behavior remains tracked below.

## 7. Implemented but Unverified

<!-- operational-state:entry
{
  "artifact_revision": "fa87d3e074f775a54ffc22adc2412787401063cf",
  "id": "UNV-001",
  "implemented": "Gate 0 and repaired UI/input code exist on current main with regression coverage.",
  "missing_evidence": "Pinned full-repository test, typecheck, build, and Vite-hosted E2E run on current main.",
  "recheck_trigger": "Any source/dependency/build change",
  "scope": "Current-main full application integration",
  "state": "implemented-unverified",
  "title": "Current-main full application integration after UI/input repairs",
  "validation_needed": "Run bun run test, bun run typecheck, bun run build, and bun run test:e2e."
}
-->
### UNV-001 — Current-main full application integration after UI/input repairs

- **State:** `implemented-unverified`
- **Artifact Revision:** fa87d3e074f775a54ffc22adc2412787401063cf
- **Implemented:** Gate 0 and repaired UI/input code exist on current main with regression coverage.
- **Missing Evidence:** Pinned full-repository test, typecheck, build, and Vite-hosted E2E run on current main.
- **Recheck Trigger:** Any source/dependency/build change
- **Scope:** Current-main full application integration
- **Validation Needed:** Run bun run test, bun run typecheck, bun run build, and bun run test:e2e.
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
  "dependency": "Human reviewer with a visible browser running current main",
  "id": "PND-001",
  "priority": "highest",
  "reason_pending": "Gate 0 is built, but decisive rendered-image, real-performance, and human-review evidence is absent.",
  "state": "pending",
  "task": "Open current main with ?debug, walk BUILD_SPEC 39.2, inspect against BUILD_SPEC 44, record frame timing, and issue GO / CONDITIONAL GO / NO-GO.",
  "title": "Complete Gate 0 visible-browser review and verdict",
  "validation_needed": "BUILD_SPEC 39.2/39.3 visual/performance/human review"
}
-->
### PND-001 — Complete Gate 0 visible-browser review and verdict

- **State:** `pending`
- **Blocks Completion:** Yes
- **Dependency:** Human reviewer with a visible browser running current main
- **Priority:** highest
- **Reason Pending:** Gate 0 is built, but decisive rendered-image, real-performance, and human-review evidence is absent.
- **Task:** Open current main with ?debug, walk BUILD_SPEC 39.2, inspect against BUILD_SPEC 44, record frame timing, and issue GO / CONDITIONAL GO / NO-GO.
- **Validation Needed:** BUILD_SPEC 39.2/39.3 visual/performance/human review
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "blocks_completion": false,
  "id": "PND-002",
  "priority": "high",
  "reason_pending": "Historical Gate 0 measurements identified bounded cost concerns.",
  "state": "pending",
  "task": "Reduce or reassess historical CPU simulation cost and checkpoint memory before production scale.",
  "title": "Gate 0 carried conditions: CPU budget and checkpoint memory",
  "validation_needed": "Re-measure on the current build after optimization."
}
-->
### PND-002 — Gate 0 carried conditions: CPU budget and checkpoint memory

- **State:** `pending`
- **Blocks Completion:** No
- **Priority:** high
- **Reason Pending:** Historical Gate 0 measurements identified bounded cost concerns.
- **Task:** Reduce or reassess historical CPU simulation cost and checkpoint memory before production scale.
- **Validation Needed:** Re-measure on the current build after optimization.
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
  "evidence": "GitHub confirms repository, default branch main, write permission, and runtime baseline fa87d3e074f775a54ffc22adc2412787401063cf before governance revision 5.",
  "id": "DEC-001",
  "last_checked": "2026-08-18",
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
- **Evidence:** GitHub confirms repository, default branch main, write permission, and runtime baseline fa87d3e074f775a54ffc22adc2412787401063cf before governance revision 5.
- **Last Checked:** 2026-08-18
- **Recheck Trigger:** Git workflow change
- **Rule:** Use https://github.com/westkitty/Event-Horizon-Forge.git with main. Do not replace the repo, silently change origin, force-push, or overwrite governance without evidence.
- **Scope:** Git workflow
- **Status:** active
- **Validation Method:** Check repo identity, branch, head, and fast-forward status after writes.
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
| UNV-001 | implemented-unverified | tests + typecheck + build + E2E |
| UNK-001 | unknown | visible-browser render inspection |
| UNK-002 | unknown | visible ?debug frame timing |
| UNK-003 | unknown | forced tiers + browser/device matrix |
| PND-001 | pending | BUILD_SPEC 39.2/39.3 review |
| PND-002 | pending | re-measure after optimization |
| PND-003 | pending | visible lens-compositing comparison |
| DEC-001 | current-baseline | repo/head verification |

## 12. Current Change Scope and Impact Radius

- **Allowed now:** bounded defect repair, evidence/test work, governance correction, and Gate 0 evidence collection.
- **Protected:** build-contract intent, screen-first interaction, scientific-fidelity boundaries, canonical repository/branch, and unaffected verified simulation-core evidence.
- **Before current main is called fully verified:** run repository tests/typecheck/build/E2E and the visible-browser visual/performance/human Gate 0 review.
- **Revision 5:** state/governance repair only; no runtime application source changes.

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
