# Controls

The rendered universe is the control surface. Nothing below needs a persistent
panel in ordinary play; interface appears only while a key is held or a gesture
is active. Persistent Controls are an explicit accessibility exception and are
off by default.

## Pointer / mouse

| Input | Action |
|---|---|
| Drag empty space | Orbit / free-look around the current focus |
| Right-drag | Explicit camera orbit (always available) |
| Drag on diffuse cloud matter | Cosmic Hand - apply the active brush |
| Drag on a field node | Move the element in 3D; field and plasma respond during the drag |
| Drag on the star | Grab and aim; a live encounter arc appears |
| Release a grabbed star | Launch with the gesture's velocity |
| Wheel / pinch | Scale dive (exponential; never hits a hard stop) |
| Wheel during a manipulation | Change brush radius, or the aim depth plane |
| Double-click | Focus the target |
| Stationary long press (~0.4 s) | Context tool wheel at the interaction locus |

A short movement threshold separates click/long-press intent from a drag. Opening
a context wheel therefore does not first grab or launch the object beneath it.
Middle and auxiliary mouse buttons do not mutate scene state.

## Touch

| Input | Action |
|---|---|
| One finger | Select / manipulate |
| Two fingers | Orbit |
| Pinch | Scale dive |
| Long press | Tool wheel |
| Drag and release a body | Throw |

No hover-only functionality. Native touch behavior remains available on revealed
DOM controls; `touch-action: none` is scoped to the scene canvas.

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
| `Tab` | Cycle major selectable entities when Persistent Controls are off; enter the toolbar normally when they are on |
| `R` | Return to the most significant recent event |
| `V` | Toggle Director |
| `Y` | Fork a branch |
| `X` | Swap active / comparison branch |
| `Backspace` / `Shift+Backspace` | Step back / forward through time |
| `H` | Force the clean immersive state |
| `Shift+H` | Toggle Persistent Controls and remember the preference |
| `Esc` | Dismiss transient UI and cancel the active tool without firing a release action |

### Hold-to-peek

Only one Peek instrument owns the transient surface at a time. Pressing another
Peek key replaces the previous instrument; releasing an older chorded key cannot
hide the currently held instrument.

| Hold | Reveals |
|---|---|
| `I` | Inspector - facts about the selection, with A/B/C fidelity tags |
| `T` | Time - tick, the three domain clocks, checkpoints, events |
| `C` | Camera viewpoint wheel (shadow / edge-on / above / chase / plasma / cloud / wide) |
| `B` | Branch compare - ghosts the alternate branch in the same space |
| `G` | Causal trace - provenance and debris stream split |
| `P` | Light Peel - crossfades the background to unlensed and dims the disk |
| `/` | This controls map |

The radial tool wheel supports arrow keys plus `Home`, `End`, `Enter`/`Space`,
and `Esc`. Focus returns to the previously focused control when it closes.

## Deviation from the contract's suggested defaults

Section 24.3 recommends `D` for the Director, while section 22.1 recommends
`WASD` for free flight - a direct conflict in the suggested defaults. Flight is
higher-frequency, so **`D` is strafe-right and the Director uses `V`**.

## Accessibility

- Browser zoom is not disabled.
- The scene canvas is keyboard-focusable and has an accessible name.
- Every primary Gate 0 action has a keyboard path.
- Revealed controls are semantic DOM elements with focus states and ARIA labels.
- **Persistent Controls** are an opt-in compact toolbar with at least 44 px touch
  targets. They expose pause state and disable unavailable branch swapping.
- Reduced Motion follows live `prefers-reduced-motion` changes for both DOM
  transitions and camera easing.
- High-contrast and forced-colors preferences remove translucency where needed
  and preserve visible borders/focus.
- Screen-reader event announcements use an atomic live region when enabled.
- Fidelity A/B/C badges expose their full meaning to assistive technology.
- No meaning is carried by color alone: field strength uses brightness and a
  travelling pulse; trajectory classification uses color and pulse rate.

## Not yet implemented

Gamepad/controller support (section 24.4), haptics, rebindable keys, and the
first-run onboarding sequence (section 25.14) remain outside Gate 0 scope.
