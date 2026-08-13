# Controls

The rendered universe is the control surface. Nothing below needs a visible
panel; UI appears only while a key is held or a gesture is active.

## Pointer / mouse

| Input | Action |
|---|---|
| Drag empty space | Orbit / free-look around the current focus |
| Right-drag | Explicit camera orbit (always available) |
| Drag on diffuse cloud matter | Cosmic Hand — apply the active brush |
| Drag on a field node | Move the element in 3D; field and plasma respond during the drag |
| Drag on the star | Grab and aim; a live encounter arc appears |
| Release a grabbed star | Launch with the gesture's velocity |
| Wheel / pinch | Scale dive (exponential; never hits a hard stop) |
| Wheel **during** a manipulation | Change brush radius, or the aim depth plane |
| Double-click | Focus the target |
| Long press (~0.4 s) | Context tool wheel at the interaction locus |

## Touch

| Input | Action |
|---|---|
| One finger | Select / manipulate |
| Two fingers | Orbit |
| Pinch | Scale dive |
| Long press | Tool wheel |
| Drag and release a body | Throw |

No hover-only functionality.

## Keyboard

| Key | Action |
|---|---|
| `Space` (tap) | Play / pause |
| `Space` + drag horizontally | Scrub time |
| `Space` + wheel | Coarse time-rate change |
| `K` | Pause |
| `J` / `L` | Seek backward / forward |
| `W A S D` | Fly (forward/left/back/right) |
| `Q` / `E` | Fly down / up |
| `Shift` | Fly faster |
| `F` | Focus what is under the cursor |
| `Tab` | Cycle major selectable entities |
| `R` | Return to the most significant recent event |
| `V` | Toggle Director |
| `Y` | Fork a branch |
| `X` | Swap active / comparison branch |
| `Backspace` / `Shift+Backspace` | Step back / forward through time |
| `H` | Force the clean immersive state |
| `Esc` | Dismiss transient UI, cancel the active tool |

### Hold-to-peek

Released immediately on key-up; never leaves a stale control.

| Hold | Reveals |
|---|---|
| `I` | Inspector — facts about the selection, with A/B/C fidelity tags |
| `T` | Time — tick, the three domain clocks, checkpoints, events |
| `C` | Camera viewpoint wheel (shadow / edge-on / above / chase / plasma / cloud / wide) |
| `B` | Branch compare — ghosts the alternate branch in the same space |
| `G` | Causal trace — provenance and debris stream split |
| `P` | Light Peel — crossfades the background to unlensed and dims the disk |
| `/` | This controls map |

## Deviation from the contract's suggested defaults

§24.3 recommends `D` for the Director, while §22.1 recommends `WASD` for free
flight — a direct conflict in the contract's own defaults. Flight is by far the
higher-frequency action, so **`D` is strafe-right and the Director moved to `V`**.

## Accessibility

- Every primary action has a keyboard equivalent.
- Revealed controls are semantic DOM elements with focus states and ARIA labels.
- **Persistent Controls** — an opt-in compact control strip that stays visible.
  Off by default, fully supported when on; it is an intentional alternate
  presentation, not a violation of the immersive default.
- Reduced Motion is honoured from `prefers-reduced-motion` and softens camera
  easing rather than stopping the simulation.
- Screen-reader event announcements are available via a live region (opt-in).
- No meaning is carried by colour alone: field strength uses brightness *and* a
  travelling pulse; trajectory classification uses colour *and* pulse rate.

## Not yet implemented

Gamepad/controller support (§24.4), haptics, rebindable keys, and the
first-run onboarding sequence (§25.14) are out of Gate 0 scope.
