# Binary Orbits

**Binary Orbits by popemkt**: page-head backdrops for [kb](https://github.com/popemkt/kb).
The extension has two backdrops:

- **Binary Orbits** (`binary-orbits.binary-orbits`). A spiral galaxy seen
  tilted back behind the page's title. Its three arms hold their shape while
  their stars stream through them. A small bulge burns white at the centre,
  and a violet haze fills the disc. The pointer gathers the stars it passes
  into a warm filament, which the rotation shears and lets go. A press on the
  backdrop's empty area bursts the stars outward, and they spring back to
  their orbits.
- **Binary Orbits Classic** (`binary-orbits.classic`). The first version: two
  bodies on a Keplerian ellipse, each trailing a stream of stars, in a disc
  whose two arms the pair drives. Its knobs are unchanged.

A page that chose Binary Orbits before the galaxy arrived now shows the
galaxy. Classic stays selectable in Backdrop Studio. Knob values a page set
carry over wherever the galaxy has a knob with the same id and meaning:
`speed`, `glow`, `palette`, `stars` and `seed`.

On a dark page both add light (`glow`). On a light page they become
coloured stipple (`ink`). The palette follows the page unless a knob
chooses one.

Inspired by React Bits Pro's [Binary Orbits](https://pro.reactbits.dev/docs/components/binary-orbits).
Both are clean-room re-creations, made by watching the public demo. The
galaxy was calibrated against recordings of the demo, frame by frame. No
code, shaders or assets were taken from React Bits Pro.

| | |
| --- | --- |
| Description | Page-head backdrops: a spiral galaxy that answers the pointer and bursts on a click, and the classic binary orbit |
| Author | popemkt ([github.com/popemkt](https://github.com/popemkt)) |
| Homepage | https://github.com/popemkt/kb-extensions/tree/main/extensions/binary-orbits |
| License | MIT (`LICENSE`) |
| Backdrop ids | `binary-orbits.binary-orbits` (the galaxy), `binary-orbits.classic` |
| Default strength | `soft` |
| Budget | `BACKDROP_BUDGETS.gpu`: 6 ms of GPU time per frame, metered with kb's frame meter |

## Capabilities

- **Network:** none. It fetches nothing and opens no connection.
- **Storage:** none. It reads and writes no `localStorage`, cookies, IndexedDB or files.
- **kb data:** none. Its server half only declares the backdrops and their
  knobs. Its page half reads only what kb hands every backdrop
  (`BackdropProps`): the knobs, strength, opacity and budget, the pointer over
  its own frame, and the owner's activity *counts* (writes, arrivals, turns,
  editing). It also reads the shown node's id, only to notice that the page
  changed. It never reads a node's content.
- **Page power:** once you trust it, its page half runs with the page's full
  power, as every trusted kb extension's does. kb's SDK types describe what a
  backdrop is for, but they do not confine it (kb gap `01M6WVFMGB5PP2AANF0E5R921V`).
  Read the source before you trust it: about 1,850 lines in
  `binary-orbits.page.tsx` and `binary-orbits/`.
- **Two reads beyond its props:**
  - Both scenes watch the `dark` class on `<html>`. The palette needs the
    page's colour scheme, and the SDK does not hand it to a backdrop yet.
  - The galaxy listens for `pointerdown` on the window. kb's pointer source
    reports where the pointer is, not when it presses, and the backdrop's frame
    takes no pointer events. The listener is passive, in the capture phase,
    and never prevents or stops anything. It bursts only when all of these hold:
    - kb's pointer source says the pointer is over the frame (so Studio's
      Interact switch governs it too);
    - it is the primary button;
    - the press is not on something meant to be pressed: a link, a button, a
      field, a label, `summary`, a dialog, anything with a `role`, `tabindex`,
      `contenteditable` or `draggable`;
    - the press is not on an element that holds text of its own.

    So the page's title, its controls and its words keep every click. Only
    the head's empty area bursts. A touch tap that was never preceded by a
    move gives kb's pointer source no place, so it does not burst.

## Knobs

Set them in Backdrop Studio, or with `kb set` on the backdrop's node.

### Binary Orbits (the galaxy)

| Knob | Id | Range | Default |
| --- | --- | --- | --- |
| Rotation speed | `speed` | 0–3 | 1 |
| Arms | `arms` | 1–8 | 3 |
| Arm twist | `twist` | 0.5–8 | 3.5 |
| Tilt (degrees) | `tilt` | 0–85 | 58 |
| Glow | `glow` | 0–2 | 0.8 |
| Arms | `arm-color` | colour | `#7b4dff` |
| Core | `core-color` | colour | `#ffc2ee` |
| Palette | `palette` | Follow the page · Glow (dark pages) · Ink (light pages) | Follow the page |
| Star density | `stars` | 0–1 (0.5 is 100,000 stars, 1 is 200,000) | 0.5 |
| Hover strength | `hover` | 0–2; 0 turns the pointer off | 1 |
| Burst strength | `burst` | 0–2; 0 turns the burst off | 1 |
| Centre across | `x` | 0–1 of the frame's width | 0.68 |
| Centre down | `y` | 0–1 of the frame's height | 0.5 |
| Size | `scale` | 0.3–2 | 1 |
| Seed | `seed` | a whole number pins the star layout; empty draws one each load | empty |

The default centre sits right of the title, so the head's text stays on
plain background. The disc's radius is 0.36 of the frame's width, or of
1.706 times its height when the frame is wider than that.

### Binary Orbits Classic

| Knob | Id | Range | Default |
| --- | --- | --- | --- |
| Orbit speed | `speed` | 0–3 | 1 |
| Separation | `separation` | 0.2–1 | 0.55 |
| Eccentricity | `eccentricity` | 0–0.8 | 0.35 |
| Trail length | `trail` | 0–1 | 0.6 |
| Glow | `glow` | 0–2 | 0.8 |
| First body | `primary` | colour | `#6f8dff` |
| Second body | `companion` | colour | `#ffad66` |
| Palette | `palette` | Follow the page · Glow (dark pages) · Ink (light pages) | Follow the page |
| Star field density | `stars` | 0–1 | 0.5 |
| Follow the pointer | `follow` | on/off | on |
| Seed | `seed` | a whole number pins the star layout; empty draws one each load | empty |

## Interactions

### Binary Orbits (the galaxy)

- **Pointer, passing:** the stars the pointer passes within about an eighth
  of the disc's radius are drawn toward its path. They glow warmer and
  brighter, in a shade of the core colour. They keep riding their own orbits,
  so inner ones run ahead and the filament shears into trailing arcs. It
  relaxes over about five seconds. A pointer at rest leaves no wake. While
  the pointer is over the disc, the galaxy turns up to half again as fast and
  burns a little brighter, and it eases back when the pointer leaves. All of
  this scales with `hover`.
- **Pointer, pressing:** a press on the backdrop's empty area (see
  Capabilities) bursts the stars near it outward on the screen, each a little
  scattered, with a flash. The push follows a critically damped curve: it
  peaks 0.3 s after the press and is gone within about two seconds, with no
  snap. Up to eight bursts add together, so a press during a return
  re-triggers it smoothly. It scales with `burst`.
- **Activity:** each write to the graph, a change arriving from elsewhere, an
  agent's finished turn, or moving to another page speeds the rotation up.
  The boost fades over a few seconds. While you are editing text, it turns
  slightly faster.
- **Reduced motion:** it draws one still frame, always the same composition,
  with no wake and no burst.

### Binary Orbits Classic

- **Pointer:** while the pointer is over the head, the orbit plane leans
  gently toward it (about 9° of tilt and 14° of yaw at most), and the far
  stars drift a few pixels the other way. It eases back when the pointer
  leaves. Turn it off with `follow`.
- **Activity and reduced motion:** as the galaxy's.

The page half declares these in each contribution's `interactions`, as kb's
backdrop contract asks, so Backdrop Studio lists them and can try each one.

## Cost

Both scenes compute everything a frame needs in the vertex shader, from a
few constants per star and the clocks. A frame uploads only uniforms.

- **The galaxy** makes two draw calls: one full-frame haze triangle and one
  point batch of up to 200,000 stars. Each star checks the wake points within
  reach of its own radius, at most 64, and the bursts in flight, at most 8.
  On an Apple M4 at 919×600, kb's frame meter read a median of 0.6–0.7 ms of
  GPU time and a p95 under 0.9 ms, including while hovering and bursting.
- **Classic** sets about 35 uniforms and makes six draw calls: one haze
  triangle and five point batches, up to 33,600 points.

On the frame meter's verdict, either scene lowers its pixel ratio and the
share of stars it draws, down to quality 0.4. It draws only while the frame
is on screen and the tab is visible.

## Files

- `binary-orbits.ts`: the server half, which is only the declaration.
- `binary-orbits.page.tsx`: the page half, which contributes both backdrops.
- `binary-orbits/key.ts`: the backdrops' keys and knobs, which both halves name.
- `binary-orbits/util.ts`: the seedable PRNG and colour parsing both scenes share.
- `binary-orbits/galaxy/scene.tsx`: the galaxy's component, with its loop,
  wake, burst, activity and meter.
- `binary-orbits/galaxy/gl.ts`: the galaxy's WebGL2 renderer and its shaders.
- `binary-orbits/classic/scene.tsx`: the classic scene's component.
- `binary-orbits/classic/gl.ts`: the classic scene's renderer and shaders.
- `binary-orbits/classic/orbit.ts`: Kepler's equation.
