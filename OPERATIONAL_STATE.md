# Operational State: Event Horizon Forge

<!-- operational-state:metadata
{
  "artifact_path": "",
  "current_baseline": {
    "identity": "repository bootstrap/specification stage on main",
    "last_verified": "2026-08-12",
    "state": "current-baseline"
  },
  "delivery_state": "repository-bootstrap",
  "last_updated": "2026-08-12T09:27:59Z",
  "linked_parent_state": null,
  "primary_artifact": "BUILD_SPEC.md",
  "project_id": "event-horizon-forge",
  "project_name": "Event Horizon Forge",
  "project_root": "https://github.com/westkitty/Event-Horizon-Forge",
  "schema_version": 1,
  "scope_boundaries": [
    "Canonical repository westkitty/Event-Horizon-Forge",
    "Browser-first Event Horizon Forge simulation and its governing build contract"
  ],
  "state_revision": 2,
  "target_environment": "browser-first TypeScript/Three.js candidate, final renderer path gated by prototype evidence"
}
-->

## 1. Project Identity and Scope

- **Project ID:** `event-horizon-forge`
- **Purpose:** Govern implementation of the Event Horizon Forge browser simulation while preserving the screen-first interaction contract and evidence state.
- **Project type:** Browser-first interactive 3D simulation repository.
- **Primary root or artifact:** `https://github.com/westkitty/Event-Horizon-Forge`
- **Target environment:** Browser-first TypeScript/Three.js candidate; renderer/compute path must pass Gate 0 before production expansion.
- **Canonical authority:** Latest explicit user instruction, this operational state, `BUILD_SPEC.md`, and verified repository/runtime evidence.
- **Governed scope:** `westkitty/Event-Horizon-Forge` and its build/runtime artifacts.
- **Explicitly not governed:** Unrelated projects and neighboring subsystems unless explicitly linked.

## 2. Current Baseline

- **Primary artifact:** `BUILD_SPEC.md` plus the ordered files under `docs/spec/`.
- **Baseline state:** `current-baseline` — repository bootstrap/specification stage.
- **Source/build/install identity:** `westkitty/Event-Horizon-Forge` `main`; runtime source tree not yet implemented.
- **Active default user route:** Not implemented; required future route is immediate immersive scene entry with no dashboard tax.
- **Delivery state:** Repository bootstrap prepared; Gate 0 implementation pending.
- **Last verified baseline:** 2026-08-12.

## 3. Artifact Contract

Build the browser-first Event Horizon Forge simulation defined by `BUILD_SPEC.md` and its ordered `docs/spec/` files. The rendered universe must remain the primary interaction surface; formation, plasma/magnetic manipulation, instability, black-hole interaction, camera, time, rewind, branching, comparison, save, and provenance must form one coherent system. Runtime completion requires evidence from the prototype gate and subsequent acceptance tests.

## 4. Active Invariants

<!-- operational-state:entry
{
  "authority": "Explicit user instruction 2026-08-12",
  "evidence": "Current user correction and BUILD_SPEC.md",
  "id": "INV-001",
  "last_checked": "revision 2",
  "recheck_trigger": "Any UI, input, camera, timeline, onboarding, inspector, or interaction change",
  "rule": "Normal immersive play must not depend on a persistent dashboard, telemetry HUD, labels, bottom bar, sliders, object list, or explanatory panel. Core actions happen through direct scene interaction, temporary contextual gestures, camera/time manipulation, and hold-to-peek inspection.",
  "scope": "Primary user journey and all future UI work",
  "state": "requested",
  "status": "active",
  "title": "The rendered universe is the interface",
  "validation_method": "Run the prototype success path with persistent UI disabled; a tester must manipulate matter, field nodes, time, camera, encounter trajectory, rewind, and compare without opening a pinned dashboard."
}
-->
### INV-001 — The rendered universe is the interface

- **State:** `requested`
- **Authority:** Explicit user instruction 2026-08-12
- **Evidence:** Current user correction and BUILD_SPEC.md
- **Last Checked:** revision 2
- **Recheck Trigger:** Any UI, input, camera, timeline, onboarding, inspector, or interaction change
- **Rule:** Normal immersive play must not depend on a persistent dashboard, telemetry HUD, labels, bottom bar, sliders, object list, or explanatory panel. Core actions happen through direct scene interaction, temporary contextual gestures, camera/time manipulation, and hold-to-peek inspection.
- **Scope:** Primary user journey and all future UI work
- **Status:** active
- **Validation Method:** Run the prototype success path with persistent UI disabled; a tester must manipulate matter, field nodes, time, camera, encounter trajectory, rewind, and compare without opening a pinned dashboard.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{
  "authority": "Explicit user instruction",
  "evidence": "BUILD_SPEC.md",
  "id": "INV-002",
  "last_checked": "revision 2",
  "recheck_trigger": "Any subsystem separation or scenario architecture change",
  "rule": "Formation, magnetic/plasma manipulation, instability, and black-hole interaction must share matter provenance, camera, time, scale, branching, save, and interaction systems rather than becoming disconnected modes or mini-apps.",
  "scope": "Simulation architecture",
  "state": "requested",
  "status": "active",
  "title": "Formation, plasma, and collapse remain one simulation",
  "validation_method": "Cross-domain integration test preserves entity provenance through formation to later plasma/black-hole use."
}
-->
### INV-002 — Formation, plasma, and collapse remain one simulation

- **State:** `requested`
- **Authority:** Explicit user instruction
- **Evidence:** BUILD_SPEC.md
- **Last Checked:** revision 2
- **Recheck Trigger:** Any subsystem separation or scenario architecture change
- **Rule:** Formation, magnetic/plasma manipulation, instability, and black-hole interaction must share matter provenance, camera, time, scale, branching, save, and interaction systems rather than becoming disconnected modes or mini-apps.
- **Scope:** Simulation architecture
- **Status:** active
- **Validation Method:** Cross-domain integration test preserves entity provenance through formation to later plasma/black-hole use.
<!-- /operational-state:entry -->

## 5. Verified Working Behavior

No runtime behavior is verified yet.

## 6. Known Not Working

No runtime failure has been established because the runtime is not implemented yet.

## 7. Implemented but Unverified

No runtime implementation is claimed yet.

## 8. Unknown or Evidence-Stale State

Renderer performance, device/browser coverage, rewind cost, lensing performance, volumetric performance, and interaction feel remain unknown until Gate 0 executes.

## 9. Pending Work

<!-- operational-state:entry
{
  "blocks_completion": true,
  "dependency": "Coding agent implementation in canonical repository",
  "id": "PND-001",
  "priority": "highest",
  "reason_pending": "Repository is intentionally at specification/bootstrap stage.",
  "state": "pending",
  "task": "Build the bounded prototype defined in BUILD_SPEC.md and evaluate renderer/compute, screen-first interaction, camera/time, rewind, lensing, volumetrics, and field manipulation before full production expansion.",
  "title": "Implement and evaluate Gate 0 representative prototype",
  "validation_needed": "Prototype gate success path, browser/device checks, performance evidence, and human interaction review"
}
-->
### PND-001 — Implement and evaluate Gate 0 representative prototype

- **State:** `pending`
- **Blocks Completion:** Yes
- **Dependency:** Coding agent implementation in canonical repository
- **Priority:** highest
- **Reason Pending:** Repository is intentionally at specification/bootstrap stage.
- **Task:** Build the bounded prototype defined in BUILD_SPEC.md and evaluate renderer/compute, screen-first interaction, camera/time, rewind, lensing, volumetrics, and field manipulation before full production expansion.
- **Validation Needed:** Prototype gate success path, browser/device checks, performance evidence, and human interaction review
<!-- /operational-state:entry -->

## 10. Active Decisions, Defaults, and Prohibitions

<!-- operational-state:entry
{
  "authority": "Explicit user instruction and verified repository metadata",
  "evidence": "GitHub connector confirmed westkitty/Event-Horizon-Forge with main as default branch",
  "id": "DEC-001",
  "last_checked": "2026-08-12",
  "recheck_trigger": "Any Git remote, branch, repository, or release workflow change",
  "rule": "Use https://github.com/westkitty/Event-Horizon-Forge.git with main as the canonical project repository. Do not create a replacement repository, silently change origin, force-push, or overwrite prepared governance files.",
  "scope": "Git workflow",
  "state": "current-baseline",
  "status": "active",
  "title": "Canonical repository and branch",
  "validation_method": "Check git remote -v, branch, and remote commit after any push"
}
-->
### DEC-001 — Canonical repository and branch

- **State:** `current-baseline`
- **Authority:** Explicit user instruction and verified repository metadata
- **Evidence:** GitHub connector confirmed westkitty/Event-Horizon-Forge with main as default branch
- **Last Checked:** 2026-08-12
- **Recheck Trigger:** Any Git remote, branch, repository, or release workflow change
- **Rule:** Use https://github.com/westkitty/Event-Horizon-Forge.git with main as the canonical project repository. Do not create a replacement repository, silently change origin, force-push, or overwrite prepared governance files.
- **Scope:** Git workflow
- **Status:** active
- **Validation Method:** Check git remote -v, branch, and remote commit after any push
<!-- /operational-state:entry -->

## 11. Validation and Evidence Matrix

| ID | Claim or behavior | State | Evidence | Validation method | Artifact/revision | Last checked | Recheck trigger |
|---|---|---|---|---|---|---|---|
| INV-001 | Rendered universe is the interface | requested | User instruction + BUILD_SPEC.md | Gate 0 user path with persistent chrome disabled | repo bootstrap | 2026-08-12 | UI/input/camera/time change |
| INV-002 | One cross-domain simulation | requested | BUILD_SPEC.md | Cross-domain provenance integration test | repo bootstrap | 2026-08-12 | subsystem architecture change |
| PND-001 | Gate 0 prototype | pending | No runtime implementation yet | Prototype gate evidence | repo bootstrap | 2026-08-12 | Gate implementation |
| DEC-001 | Canonical repo/branch | current-baseline | GitHub repository metadata | `git remote -v`, branch and remote SHA | main bootstrap | 2026-08-12 | Git workflow change |

## 12. Current Change Scope and Impact Radius

- **Allowed to change:** Repository scaffold and implementation files required by the bounded Gate 0 prototype, then production phases only after the gate verdict permits expansion.
- **Must remain unchanged:** `AGENTS.md`, build-contract intent, screen-first interaction invariant, scientific-fidelity boundaries, canonical remote/branch, and evidence rules unless explicitly superseded.
- **Potentially affected behavior:** Renderer architecture, scene interaction, camera, time, checkpoint/rewind, volumetrics, plasma field manipulation, lensing, and capability fallback.
- **Mandatory checks:** Gate 0 success path, browser/runtime error checks, performance evidence, and human interaction review defined by the build contract.
- **Checks deliberately reused:** Research benchmark conclusions may be reused until a material external change makes them stale; runtime evidence may not be invented or reused across mismatched builds.
- **Repair class:** Bounded prototype implementation followed by one repair pass per governing workflow.

## 13. Compact Revision Log

### Revision 1 — 2026-08-12T09:27:36Z

- **Artifact/source identity:** `Not yet established`
- **State deltas:** Initialized operational state.
- **New evidence:** None.
- **Validation not performed:** All behavioral validation remains pending unless explicitly recorded above.

### Revision 2 — 2026-08-12T09:27:59Z

- **Artifact/source identity:** westkitty/Event-Horizon-Forge main bootstrap
- **State deltas:** Established canonical repository, project purpose, screen-first invariant, cross-domain invariant, Gate 0 pending work, and Git protections.
- **New evidence:** Canonical repository confirmed as https://github.com/westkitty/Event-Horizon-Forge; repository bootstrap stage; no runtime implementation verified.
- **Newly verified behavior:** None.
- **Newly known failure:** None.
- **Superseded rule:** None.
- **Validation not performed:** No runtime simulation exists yet; no browser/device performance claims verified yet.
- **Reason for broad revalidation:** Not applicable.
- **Summary:** Bootstrap canonical repository governance and protect the screen-first interaction contract.
