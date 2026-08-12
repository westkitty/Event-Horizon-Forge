# Event Horizon Forge — Screen-First Experience Contract

This document protects the primary user experience during implementation. It is subordinate only to newer explicit user instructions and `OPERATIONAL_STATE.md`.

## Governing idea

**The rendered universe is the interface.**

The user should spend almost all active time looking at and touching the simulation itself. UI is a summoned instrument for precision, explanation, accessibility, configuration, and infrequent choices. It is not the operating surface of the product.

A visually beautiful build still fails if the user must repeatedly leave the phenomenon to operate a toolbar, parameter panel, object browser, permanent timeline, mode picker, or telemetry HUD.

## Zero-chrome default

During ordinary immersive playback, allow the 3D scene to contain zero persistent words, numbers, labels, charts, legends, timeline ticks, sliders, toolbars, badges, panels, object names, or scenario titles.

Allowed default exceptions are deliberately tiny:

- an optional cursor/reticle while interaction is active;
- an accessibility indicator when required;
- a brief loading/error state when the simulation cannot yet own the screen.

When the user becomes passive, even the cursor and hints should fade into **Silent Watch**.

## Three disclosure depths

### Immersive

Default. Universe only. Core actions remain possible.

### Peek

Press-and-hold, long-press, context gesture, or keyboard hold temporarily reveals only what is relevant to the current target. Release hides it again.

Examples:

- hold Inspector: selected object name/model status/essential values appear near the target or in one small temporary surface;
- hold Time: transient temporal affordance appears around the gesture focus;
- hold Camera: contextual viewpoint wheel appears;
- hold Branch: current alternate branch can be previewed without opening a branch manager.

### Inspect

An explicitly pinned Inspector/Science/Settings state may contain numbers, prose, charts, exact parameter entry, accessibility settings, export controls, and model-fidelity information. Pinned UI must be dismissible in one action and is never the default spectacle state.

## Interaction grammar

The user should learn a small vocabulary of actions that works across domains:

- touch/grab;
- pull/push;
- gather/disperse;
- twist/spin;
- heat/energize/cool;
- place/move field structure;
- release;
- throw/feed;
- focus;
- orbit/fly/scale-dive;
- pause;
- scrub/rewind;
- fork;
- compare;
- trace.

Do not create a different control language for nebulae, plasma, stars, and black holes when the same spatial verb can be contextualized safely.

## Scene-native feedback

Invisible variables must communicate through the world itself before resorting to text.

Examples:

- gathering matter bends nearby flow toward the interaction volume;
- added angular momentum appears as temporary curved flow ribbons;
- heating changes motion/emissivity locally;
- magnetic manipulation temporarily reveals selected field geometry and plasma response;
- a thrown star shows a temporary projected encounter arc only while aiming;
- time scrub creates short temporal echoes/trajectory traces instead of demanding a timeline bar;
- branch comparison uses same-space ghosting/crossfade before numeric diffs;
- scale transition adds local particulate/parallax cues so movement remains legible.

Helpers disappear on release unless the user pins analysis mode.

## Signature scene-native systems

### Cosmic Hand

A pointer/touch manipulation volume for diffuse matter. The user grabs a region of cloud/plasma, pulls or compresses it, twists to add angular momentum, changes depth/strength contextually, then releases it back to the solver. The interaction volume is shown through local matter response rather than a giant cursor widget.

### Magnetic Loom

Field nodes/structures are manipulated directly in 3D. Moving, rotating, resizing, strengthening, weakening, or reversing a node visibly changes nearby field traces and plasma behavior in real time. The user should feel like they are weaving constraints through luminous matter, not editing a magnetic-field form.

### Throw Into Darkness

A star, protostar, cloud, debris body, or supported feedstock can be grabbed and thrown toward a compact object. While held, a restrained encounter/orbit preview appears in space. Release commits the trajectory. Rewind allows the user to change one gesture and discover a different outcome.

### Time Lens

Time should not require a permanent bottom timeline. A temporal gesture temporarily turns the vicinity of the pointer/focus into a time lens: before/after echoes, trajectory ribbons, checkpoint/event notches, and direction cues appear only while scrubbing. Release returns the screen to the universe.

### Branch Ghost

Counterfactual comparison should happen in the same spatial context whenever possible. Hold a compare gesture to crossfade or ghost the alternate branch over the current state; use synchronized camera/focus/time. Split-screen and numeric diff panels are secondary analysis tools, not the default comparison experience.

### Causal Trace

Select matter or an object and temporarily reveal its provenance: which cloud region/clump it came from, field interaction, stellar transition, stripping event, or accretion path. The trace should be spatial and temporal first; textual provenance is optional Inspector detail.

### Photon Path Peek

Near strong lensing events, allow selected representative light paths to be temporarily traced so the user can see why a background source appears where it does. This is an analytical layer, not constant decoration, and must match the implemented lens model rather than drawing arbitrary spirals.

### Scale Dive

Zoom is semantic travel. It moves smoothly between wide cloud/system frames, disks, stellar structures, plasma structures, and near-horizon inspection while preserving focus direction and apparent continuity. No loading-screen-feeling reset and no permanent scale HUD.

### Observer Shift

The user can temporarily jump among meaningful observational frames—free observer, target-relative, incoming-body chase, disk orbit, tidal-stream ride, field-line ride, jet ride, black-hole shadow—without opening a camera settings page. Manual input always wins immediately.

### Light Peel

A press-and-hold analytical gesture can temporarily peel away glare/occlusion or isolate selected emissive/field layers to inspect structure. This is not X-ray cheating presented as literal vision; Science mode labels it as an analysis visualization.

### Moment Marks

Important simulation events become invisible temporal anchors automatically: first collapse threshold, protostar formation, jet burst, plasma instability, confinement failure, tidal threshold, first stripping, debris wrap, strong lensing alignment. The user can return/rewind to them without maintaining a visible timeline.

### Silent Watch

When input stops, remove transient helpers, controls, cursor and Director intervention. Let the event breathe. The simulation should be visually compelling enough that doing nothing is still a legitimate state—but unlike a screensaver, direct agency is always one gesture away.

## Camera sovereignty

The user owns the camera.

Required behaviors:

- orbit/focus selected phenomena;
- free 6DOF-style flight where appropriate;
- smooth semantic zoom across scale frames;
- chase incoming bodies;
- ride selected streams/jets/field lines;
- orbit/inspect accretion structures from any angle;
- pause and detach during catastrophic events;
- remember recent focus/event anchors for quick back/forward return.

An optional Director may suggest strong framing around event geometry. Any manual camera input suspends Director in the same interaction frame. No cinematic animation gets to finish first.

## First thirty seconds

Do not begin with a landing dashboard or setup wizard.

A first-time user should enter a visually alive starting scene immediately. The experience teaches through response:

1. nearby matter subtly acknowledges the pointer/touch;
2. the first grab produces unmistakable spatial feedback;
3. releasing the manipulation causes visible downstream evolution;
4. one brief nonverbal/very short contextual cue may introduce pause/rewind after the first meaningful change;
5. traditional controls/help remain available through an explicit temporary help gesture.

If onboarding requires paragraphs before the user can touch the universe, redesign it.

## Accessibility without corrupting the default

Hidden UI is a default presentation strategy, not an excuse to hide necessary accessibility.

Provide:

- keyboard equivalents for primary actions;
- semantic DOM controls when UI is revealed;
- visible focus states;
- no color-only meaning;
- Reduced Motion;
- reduced flash/bloom/intensity;
- high-contrast UI option;
- captions/text equivalents for sonification cues;
- touch targets large enough when temporarily revealed;
- optional **Persistent Controls** accessibility mode that deliberately keeps a compact semantic control strip visible.

Persistent Controls is fully supported but off by default. Do not degrade it into a second-class mode.

## Failure and loading states

Do not strand the user behind a blank canvas or raw WebGPU error.

Loading should be brief, restrained, and visually consistent. Once enough assets/compute are ready, transition into the scene as early as possible.

If the renderer/device fails:

- pause safely;
- preserve recoverable scenario state;
- reveal one concise recovery surface;
- offer retry/lower-tier/reload when valid;
- hide it again after recovery.

## Product tests for this contract

A representative Gate 0 tester must be able to complete the following with persistent chrome disabled:

1. enter the simulation;
2. move/focus/orbit/zoom the camera;
3. manipulate diffuse matter directly;
4. manipulate at least two field elements directly;
5. visibly destabilize plasma;
6. grab/aim/release an incoming body toward the black-hole scenario;
7. pause during a major event;
8. freely inspect it;
9. scrub/rewind through the event;
10. fork a branch;
11. change one condition;
12. compare the alternate result in the same spatial context;
13. return to Silent Watch;
14. complete all of this without needing a pinned dashboard, developer control panel, object browser, or permanent timeline.

If any core step requires opening conventional production chrome, the screen-first interaction contract fails and must be repaired before production expansion.
